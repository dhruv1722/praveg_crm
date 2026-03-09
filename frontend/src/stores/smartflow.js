import { defineStore } from 'pinia'

let timerInterval = null

export const useSmartflowCallStore = defineStore('smartflowCall', {
  state: () => ({
    isOpen: false,
    callId: null,
    status: null,
    to: null,
    from_number: null,
    leadName: null,
    startTime: null,
    timer: 0,

    _lastCallId: null,
    _lastLeadName: null,
    _lastTo: null,
  }),

  actions: {
    open(callId, to, leadName = null, from_number = null) {
      this.stopTimer()
      this.isOpen = true
      this.callId = callId
      this.to = to
      this.from_number = from_number
      this.leadName = leadName || this._lastLeadName
      this.status = 'Initiated'
      this.timer = 0

      // Last values save karo
      this._lastCallId = callId
      if (leadName) this._lastLeadName = leadName
      if (to) this._lastTo = to
    },

    softReset() {
      this.stopTimer()
      this.isOpen = false
      this.callId = null
      this.status = null
      this.to = null
      this.from_number = null
      this.leadName = null
      this.timer = 0
      // _last* values mat clear karo — webhook event ke liye chahiye
    },

    updateStatus(status) {
      this.status = status

      if (status === 'In Progress') {
        this.startTimer()
      }

      if (
        status === 'Completed' ||
        status === 'Disconnected' ||
        status === 'Failed' ||
        status === 'No Answer' ||
        status === 'Busy' ||
        status === 'Canceled'
      ) {
        this.stopTimer()
        setTimeout(() => {
          this.reset()
        }, 1500) // 1.5 sec so user sees Disconnected
      }
    },

    startTimer() {
      if (timerInterval) return
      this.startTime = Date.now()
      timerInterval = setInterval(() => {
        this.timer = Math.floor((Date.now() - this.startTime) / 1000)
      }, 1000)
    },

    stopTimer() {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    },

    // Full reset — _last* bhi clear
    reset() {
      this.stopTimer()
      this.isOpen = false
      this.callId = null
      this.status = null
      this.to = null
      this.from_number = null
      this.leadName = null
      this.timer = 0
      this._lastCallId = null
      this._lastLeadName = null
      this._lastTo = null
    },
  },
})
