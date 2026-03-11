import { watch } from 'vue'
import { toast } from 'frappe-ui'
import { createResource } from 'frappe-ui'

export function useCRMDealModal(deal) {

  function normalizeDate(d) {
    const date = new Date(d)
    date.setHours(0, 0, 0, 0)
    return date
  }

  function validateDates(showToast = false) {
    const { custom_check_in, custom_check_out } = deal.doc

    if (!custom_check_in || !custom_check_out) {
      deal.doc.custom_no_of_nights = 0
    }

    const todayDate = normalizeDate(new Date())
    const checkInDate = custom_check_in ? normalizeDate(custom_check_in) : null
    const checkOutDate = custom_check_out ? normalizeDate(custom_check_out) : null

    let error = null

    if (checkInDate && checkInDate < todayDate) {
      error = 'Check-in date cannot be before today.'
    }

    if (checkOutDate && !checkInDate) {
      error = 'Check-out date cannot be set without Check-in date.'
    }

    if (checkInDate && checkOutDate) {
      if (checkOutDate <= checkInDate) {
        error = 'Check-out date must be after Check-in date.'
      } else {
        const diffTime = checkOutDate - checkInDate
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        deal.doc.custom_no_of_nights = diffDays
      }
    }

    if (error && showToast) {
      toast.error(error)
    }

    return error
  }

  async function fetchExtraBedRate(doc) {
    if (!doc.custom_hotel_property) {
      doc.custom_extra_bed_rate = 0
      doc.custom_guest = [] // clear child table if hotel property is cleared
      return
    }

    const extraBedRateResource = createResource({
      url: "frappe.client.get_value",
      params: {
        doctype: "CRM Hotel Property",
        filters: { name: doc.custom_hotel_property },
        fieldname: ["extra_bed_rate"],
      },
      auto: true,
      onSuccess(data) {
        if (data?.extra_bed_rate) {
          doc.custom_extra_bed_rate = data.extra_bed_rate
        } else {
          doc.custom_extra_bed_rate = 0
        }
      },
      onError(err) {
        toast.error(err?.messages?.[0] || "Failed to fetch extra bed rate")
      }
    })
  }

  function setupWatchers() {
    watch(
      () => [deal.doc.custom_hotel_property],
      () => {
        fetchExtraBedRate(deal.doc)
      },
      { immediate: true }
    )

    watch(
      () => [deal.doc.custom_check_in, deal.doc.custom_check_out],
      () => {
        validateDates(true) // show toast on every keystroke
      },
      { immediate: true }
    )
  }

  function beforeCreate() {
    return validateDates(false) // don't show toast
  }

  return {
    setupWatchers,
    beforeCreate,
  }
}
