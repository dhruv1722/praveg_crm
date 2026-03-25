import { watch } from 'vue'
import { toast, createResource, LoadingIndicator } from 'frappe-ui'
import dayjs from "dayjs"

export function useCRMLead(doc, document) {

  const watchedRows = new WeakSet()
  const mealTaxPercentByRow = new WeakMap()
  const packageTaxPercentByRow = new WeakMap()

  function isChecked(value) {
    return value === true || value === 1 || value === "1"
  }

  function toNumber(value) {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  function getRowType(row) {
    return (row?.type || "").trim()
  }

  function getRoomTaxPercent(unitRate) {
    if (unitRate > 7500) return 18
    if (unitRate > 1000) return 5
    return 0
  }

  function parseDate(value) {
    if (!value) return null

    const parsedDate = dayjs(value).startOf("day")
    return parsedDate.isValid() ? parsedDate : null
  }

  let baselineDocName = doc.value?.name || null
  let oldCheckIn = parseDate(doc.value.custom_check_in)
  let oldCheckOut = parseDate(doc.value.custom_check_out)

  function syncDateBaseline() {
    const currentDocName = doc.value?.name || null

    if (baselineDocName === currentDocName) return

    oldCheckIn = parseDate(doc.value.custom_check_in)
    oldCheckOut = parseDate(doc.value.custom_check_out)
    baselineDocName = currentDocName
  }

  function validateDates(showToast = false) {
    syncDateBaseline()

    const today = dayjs().startOf("day")
    const { custom_check_in, custom_check_out } = doc.value

    const checkInDate = parseDate(custom_check_in)

    const checkOutDate = parseDate(custom_check_out)

    let error = null

    // // Only validate if user has entered something
    // if (checkInDate && checkInDate.isBefore(today)) {
    //   error = 'Check-in date cannot be before today.'
    // }

    const checkInChanged = !(
      (oldCheckIn === null && checkInDate === null) ||
      (oldCheckIn && checkInDate && checkInDate.isSame(oldCheckIn, "day"))
    )

    const checkOutChanged = !(
      (oldCheckOut === null && checkOutDate === null) ||
      (oldCheckOut && checkOutDate && checkOutDate.isSame(oldCheckOut, "day"))
    )

    const hasDateChanged = checkInChanged || checkOutChanged

    if (checkInChanged && checkInDate && checkInDate.isBefore(today)) {
      error = 'Check-in date cannot be before today.'
    }

    if (checkOutChanged && checkOutDate && !checkInDate) {
      error = 'Check-out date cannot be set without Check-in date.'
    }

    if (checkInDate && checkOutDate) {
      if (!checkOutDate.isAfter(checkInDate)) {
        if (hasDateChanged) {
          error = 'Check-out date must be after Check-in date.'
        }
      } else {
        doc.value.custom_no_of_nights =
          checkOutDate.diff(checkInDate, 'day')
      }
    } else {
      doc.value.custom_no_of_nights = 0
    }

    // if (error && showToast) {
    //   toast.error(error)
    // }

    return error
  }

  function setupChildRowWatcher(row) {
    watch(
      () => [row.type, row.no_of_rooms, row.extra_beds],
      ([type, rooms, extraBeds]) => {
        if (type !== "Room") {
          if (extraBeds && toNumber(row.no_of_extra_bed)) {
            row.no_of_extra_bed = 0
          }
          return
        }

        const shouldApplyExtraBeds = isChecked(extraBeds)
        const syncedRooms = parseInt(rooms || 0, 10)
        const syncedExtraBeds = shouldApplyExtraBeds ? syncedRooms : 0
        const currentExtraBeds = parseInt(row.no_of_extra_bed || 0, 10)
        if (currentExtraBeds !== syncedExtraBeds) {
          row.no_of_extra_bed = syncedExtraBeds
          row.extra_bed_rate = doc.value.custom_extra_bed_rate
        }
      },
    )

    // Watch all fields that should trigger recalculation
    watch(
      () => [
        doc.value.custom_extra_bed_rate,
        doc.value.custom_no_of_nights,
        row.type,
        row.no_of_rooms,
        row.extra_beds,
        row.room_category,
        row.rate_type,
        row.room_rate_per_night,
        row.meal_plan,
        row.meal_rate_per_person,
        row.number_of_meal_persons,
        row.no_of_extra_bed,
        row.adult,
        row.discount_percent,
        row.package,
        row.package_rate_per_unit,
        row.total_package,
      ],
      () => {
        calculateChildRow(row)
      },
      { deep: true }
    )


    watch(
      () => row.room_category,
      () => {
        if (getRowType(row) !== "Room") return

        row.rate_type = ""
        row.room_rate_per_night = 0
        calculateChildRow(row)
      }
    )

    watch(
      () => row.rate_type,
      () => {
        if (getRowType(row) !== "Room") return

        fetchRoomRate(row)
      }
    )

    watch(
      () => row.meal_plan,
      () => {
        if (getRowType(row) !== "Meal") return

        fetchMealRate(row)
      }
    )

    watch(
      () => row.package,
      () => {
        if (getRowType(row) !== "Package") return

        fetchPackageRate(row)
      }
    )

    watch(
      () => row.type,
      (type) => {
        if (type === "Room") {
          fetchRoomRate(row)
          return
        }

        if (type === "Meal") {
          fetchMealRate(row)
          return
        }

        if (type === "Package") {
          fetchPackageRate(row)
          return
        }

        calculateChildRow(row)
      },
    )
  }

  function getMealPersonCount(row) {
    const adult_count = parseInt(row.adult || 0)

    const child_ages = [
      row["first_child_age"],
      row["second_child_age"],
      row["third_child_age"],
      row["fourth_child_age"],
      row["fifth_child_age"],
    ]

    let child_count = 0

    child_ages.forEach(age => {
      if (age === null || age === undefined || age === "") return

      age = parseInt(age)
      if (age >= 7) {
        child_count++
      }
    })

    return adult_count + child_count
  }

  function calculateChildRow(row) {
    const rowType = getRowType(row)
    const nights = toNumber(doc.value.custom_no_of_nights)
    const isRoomType = rowType === "Room"
    const isMealType = rowType === "Meal"
    const isPackageType = rowType === "Package"

    // ROOM
    const no_of_rooms = toNumber(row.no_of_rooms)
    const room_rate = toNumber(row.room_rate_per_night)
    row.total_room_nights = no_of_rooms * nights
    row.room_charges = row.total_room_nights * room_rate

    // MEAL
    const meal_persons = toNumber(row.number_of_meal_persons)
    const meal_rate = toNumber(row.meal_rate_per_person)
    row.total_meal_count = meal_persons * nights
    row.meal_charges = row.total_meal_count * meal_rate

    // Meal unit rate per night (meal rate * meal persons) - used for tax calculation
    row.meal_unit_rate = meal_persons * meal_rate

    // PACKAGE
    const package_quantity = isPackageType ? toNumber(row.total_package) : 0
    const package_rate = toNumber(row.package_rate_per_unit)
    row.package_charges = package_quantity * package_rate

    // EXTRA BED
    const hasExtraBeds = isRoomType && isChecked(row.extra_beds)
    const extra_beds = hasExtraBeds ? toNumber(row.no_of_extra_bed) : 0
    const extra_bed_rate = toNumber(doc.value.custom_extra_bed_rate)
    row.total_extra_bed_nights = extra_beds * nights
    row.extra_bed_charges = row.total_extra_bed_nights * extra_bed_rate

    let unitRate = 0
    let lineTotal = 0
    let taxPercent = 0

    if (isRoomType) {
      unitRate = room_rate + (hasExtraBeds ? extra_bed_rate : 0)
      lineTotal = row.room_charges + row.extra_bed_charges
      taxPercent = getRoomTaxPercent(unitRate)
    } else if (isMealType) {
      unitRate = row.meal_unit_rate
      lineTotal = row.meal_charges
      taxPercent = toNumber(mealTaxPercentByRow.get(row))
    } else if (isPackageType) {
      unitRate = package_rate
      lineTotal = row.package_charges
      taxPercent = toNumber(packageTaxPercentByRow.get(row))
    }

    row.rate_per_unit = unitRate
    row.apply_tax_percent = taxPercent
    row.gross_amount = lineTotal

    // -------------------
    // DISCOUNT
    // -------------------
    let discount_percent = toNumber(row.discount_percent)
    // DISCOUNT VALIDATION
    if (discount_percent < 0 || discount_percent > 10) {
      toast.error('Discount must be between 0 and 10.')
      row.discount_percent = 0
      discount_percent = 0
    }

    if (!isRoomType) {
      discount_percent = 0
      if (toNumber(row.discount_percent)) {
        row.discount_percent = 0
      }
    }
    row.discount_value = (lineTotal * discount_percent) / 100

    // -------------------
    // TAXABLE
    // -------------------
    row.net_amount = lineTotal - row.discount_value

    // -------------------
    // GST SPLIT
    // -------------------
    row.gst_5_percent = 0
    row.gst_18_percent = 0

    if (taxPercent === 5) {
      row.gst_5_percent = row.net_amount * 0.05
    }

    if (taxPercent === 18) {
      row.gst_18_percent = row.net_amount * 0.18
    }

    row.gst_amount = row.net_amount * (taxPercent / 100)

    // -------------------
    // GRAND TOTAL
    // -------------------
    row.line_total = row.net_amount + row.gst_amount

    calculateChildTotals()
  }

  function calculateChildTotals() {
    const rows = doc.value.custom_guest || []

    doc.value.custom_gross_total = rows.reduce(
      (sum, row) => sum + parseFloat(row.gross_amount || 0),
      0
    )

    doc.value.custom_discount_total = rows.reduce(
      (sum, row) => sum + parseFloat(row.discount_value || 0),
      0
    )

    doc.value.custom_net_total = rows.reduce(
      (sum, row) => sum + parseFloat(row.net_amount || 0),
      0
    )

    doc.value.custom_tax_total = rows.reduce(
      (sum, row) => sum + parseFloat(row.gst_amount || 0),
      0
    )

    doc.value.custom_grand_total = rows.reduce(
      (sum, row) => sum + parseFloat(row.line_total || 0),
      0
    )
  }

  async function fetchExtraBedRate(doc) {
    if (!doc.value.custom_hotel_property) {
      doc.value.custom_extra_bed_rate = 0
      doc.value.custom_guest = [] // clear child table if hotel property is cleared
      return
    }

    const extraBedRateResource = createResource({
      url: "frappe.client.get_value",
      params: {
        doctype: "CRM Hotel Property",
        filters: { name: doc.value.custom_hotel_property },
        fieldname: ["extra_bed_rate"],
      },
      auto: true,
      onSuccess(data) {
        if (data?.extra_bed_rate) {
          doc.value.custom_extra_bed_rate = data.extra_bed_rate
        } else {
          doc.value.custom_extra_bed_rate = 0
        }
      },
      onError(err) {
        toast.error(err?.messages?.[0] || "Failed to fetch extra bed rate")
      }
    })
  }

  async function fetchRoomRate(row) {
    if (getRowType(row) !== "Room") {
      row.room_rate_per_night = 0
      calculateChildRow(row)
      return
    }

    if (!row.room_category || !row.rate_type) {
      row.room_rate_per_night = 0
      calculateChildRow(row)
      return
    }

    const filters = {
      name: row.rate_type,
      room_category: row.room_category,
      hotel_property: doc.value.custom_hotel_property || undefined,
      status: "Active",
    }

    const roomRateResource = createResource({
      url: "frappe.client.get_value",
      params: {
        doctype: "CRM Property Room Category",
        filters,
        fieldname: ["rc_base_rate"],
      },
      auto: true,
      onSuccess(data) {
        row.actual_room_rate = toNumber(data?.rc_base_rate)
        row.room_rate_per_night = toNumber(data?.rc_base_rate)
        calculateChildRow(row)
      },
      onError(err) {
        row.room_rate_per_night = 0
        calculateChildRow(row)
        toast.error(err?.messages?.[0] || "Failed to fetch room rate")
      }
    })
  }

  async function fetchMealRate(row) {
    if (!row.meal_plan) {
      row.meal_rate_per_person = 0
      mealTaxPercentByRow.set(row, 0)
      calculateChildRow(row)
      return
    }

    const mealRateResource = createResource({
      url: "frappe.client.get_value",
      params: {
        doctype: "CRM Property Meal Plan",
        filters: { name: row.meal_plan },
        fieldname: ["mp_rate", "gst_percent"],
      },
      auto: true,
      onSuccess(data) {
        row.meal_rate_per_person = toNumber(data?.mp_rate)
        mealTaxPercentByRow.set(row, toNumber(data?.gst_percent))
        calculateChildRow(row)
      },
      onError(err) {
        row.meal_rate_per_person = 0
        mealTaxPercentByRow.set(row, 0)
        calculateChildRow(row)
        toast.error(err?.messages?.[0] || "Failed to fetch meal rate")
      }
    })
  }

  async function fetchPackageRate(row) {
    if (!row.package) {
      row.package_rate_per_unit = 0
      packageTaxPercentByRow.set(row, 0)
      calculateChildRow(row)
      return
    }

    const packageRateResource = createResource({
      url: "frappe.client.get_value",
      params: {
        doctype: "Property Package",
        filters: {
          name: row.package,
          hotel_property: doc.value.custom_hotel_property || undefined,
          status: "Active",
        },
        fieldname: ["package_rate", "gst_percent"],
      },
      auto: true,
      onSuccess(data) {
        row.package_rate_per_unit = toNumber(data?.package_rate)
        packageTaxPercentByRow.set(row, toNumber(data?.gst_percent))
        calculateChildRow(row)
      },
      onError(err) {
        row.package_rate_per_unit = 0
        packageTaxPercentByRow.set(row, 0)
        calculateChildRow(row)
        toast.error(err?.messages?.[0] || "Failed to fetch package rate")
      }
    })
  }

  function setupWatchers() {
    watch(
      () => [doc.value.custom_hotel_property],
      () => {
        fetchExtraBedRate(doc)
      },
    )

    watch(
      () => [doc.value.custom_check_in, doc.value.custom_check_out],
      () => {
        validateDates(false) // show toast on every keystroke
      }
    )

    watch(
      () => doc.value.custom_guest,
      (rows) => {
        rows?.forEach((row) => {
          if (!watchedRows.has(row)) {
            setupChildRowWatcher(row)
            watchedRows.add(row)
          }
        })
      },
      { deep: true }
    )
  }

  function beforeSave() {
    return validateDates(false) // don't show toast
  }

  async function generate_quotation_pdf() {
    if (!doc.value?.name) {
      toast.error('Please save the quotation first')
      return
    }

    toast.info('Generating quotation...', { icon: LoadingIndicator })

    document.generateQuotationVersion.submit(null, {
      onSuccess: (data) => {
        // document.reload()
        toast.success(
          data?.message.version ? `Quotation v${data.message.version} generated` : 'Quotation generated'
        )
      },
      onError: (err) => {
        toast.error(err?.messages?.[0] || 'Failed to generate quotation')
      },
    })
  }

  // near the bottom, before the return
  async function generate_quotation_template() {
    document.generateQuotationTemplate.submit(null, {
      onSuccess: (data) => {
        toast.success('Template generated')
      },
      onError: (err) => {
        toast.error(err?.messages?.[0] || 'Failed to generate template')
      },
    })
  }

  async function send_whatsapp_quotation() {
    if (!doc.value.custom_quotation_template) {
      toast.error('Please generate a template first')
      return
    }

    const phone = String(doc.value.mobile_no || '').replace(/\D/g, '')
    if (!phone) {
      toast.error('Invalid phone number')
      return
    }

    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(doc.value.custom_quotation_template)}`

    window.open(url, "_blank");
  }

  async function generate_payment_template() {
    document.generatePaymentTemplate.submit(null, {
      onSuccess: (data) => {
        toast.success('Template generated')
      },
      onError: (err) => {
        toast.error(err?.messages?.[0] || 'Failed to generate template')
      },
    })
  }

  async function send_whatsapp_payment() {
    if (!doc.value.custom_payment_link_template) {
      toast.error('Please generate a template first')
      return
    }

    const phone = String(doc.value.mobile_no || '').replace(/\D/g, '')
    if (!phone) {
      toast.error('Invalid phone number')
      return
    }

    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(doc.value.custom_payment_link_template)}`

    window.open(url, "_blank");
  }

  function room_rate_modify(row, action) {
    // adjust this name if your field is different
    const rate_modifier = toNumber(row.rate_modifier ?? 0)

    const current_room_rate_per_night = toNumber(row.room_rate_per_night)

    if (action === "plus") {
      row.room_rate_per_night = current_room_rate_per_night + rate_modifier
    } else {
      row.room_rate_per_night = Math.max(0, current_room_rate_per_night - rate_modifier)
    }

    // recalc row totals and overall totals
    calculateChildRow(row)
  }

  const buttonHandlers = {
    plus_rate: (row) => room_rate_modify(row, "plus"),
    minus_rate: (row) => room_rate_modify(row, "minus"),
    custom_generate_quotation: generate_quotation_pdf,
    custom_generate_template: generate_quotation_template,
    custom_share_on_whatsapp: send_whatsapp_quotation,
    custom_generate_template_payment: generate_payment_template,
    custom_share_on_whatsapp_payment: send_whatsapp_payment
  }

  return {
    setupWatchers,
    beforeSave,
    buttonHandlers
  }
}