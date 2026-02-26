import { defineStore } from 'pinia'

let timerInterval = null

export const useSmartflowCallStore = defineStore('smartflowCall', {
  state: () => ({
    isOpen: false,
    callId: null,
    status: null,
    to: null,
    leadName: null,
    startTime: null,
    timer: 0,

    // Reset ke baad bhi yaad rahe — taaki "Disconnected" popup mein name dikhे
    _lastCallId: null,
    _lastLeadName: null,
    _lastTo: null,
  }),

  actions: {
    open(callId, to, leadName = null) {
      this.stopTimer()
      this.isOpen = true
      this.callId = callId
      this.to = to
      this.leadName = leadName
      this.status = 'Initiated'
      this.timer = 0

      // Last values save karo
      this._lastCallId = callId
      if (leadName) this._lastLeadName = leadName
      if (to) this._lastTo = to

      setTimeout(() => {
        this.reset()
      }, 10000)
    },

    // Popup band hua but call abhi chal rahi hai
    // Last values preserve karo
    softReset() {
      this.stopTimer()
      this.isOpen = false
      this.callId = null
      this.status = null
      this.to = null
      this.leadName = null
      this.timer = 0
      // _last* values mat clear karo — webhook event ke liye chahiye
    },

    updateStatus(status) {
	return
      this.status = status

      // if (status === "In Progress") {
      // 	this.startTimer();
      // }

      if (
        status === 'Completed' ||
        status === 'Failed' ||
        status === 'No Answer' ||
        status === 'Busy' ||
        status === 'Canceled'
      ) {
        this.stopTimer()
        setTimeout(() => {
          this.reset()
        }, 8000)
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
      this.leadName = null
      this.timer = 0
      this._lastCallId = null
      this._lastLeadName = null
      this._lastTo = null
    },
  },
})
