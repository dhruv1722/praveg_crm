import { defineStore } from 'pinia'
export const useDialerLeadFilterStore = defineStore('dialer-lead-filter', {
  state: () => ({
    pending: null,
    seq: 0,
  }),

  actions: {
    request(phone) {
      this.pending = {
        phone: String(phone || ''),
        ts: Date.now(),
      }
      this.seq += 1
    },

    take() {
      const out = this.pending
      this.pending = null
      return out
    },
  },
})