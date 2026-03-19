import { defineStore } from 'pinia'

const TERMINAL_STATUSES = [
  'Completed',
  'Disconnected',
  'Failed',
  'No Answer',
  'Busy',
  'Canceled',
]

const STATUS_RANK = {
  Initiated: 0,
  Ringing: 1,
  'In Progress': 2,
  Completed: 3,
  Disconnected: 3,
  Failed: 3,
  'No Answer': 3,
  Busy: 3,
  Canceled: 3,
}

function getStatusRank(status) {
  return STATUS_RANK[status] ?? 0
}

function buildCallState(data = {}) {
  return {
    isOpen: true,
    callId: data.call_id || null,
    status: data.status || 'Initiated',
    to: data.to || null,
    from_number: data.from_number || null,
    leadName: data.lead_name || null,
    answeredBy: data.answered_by || null,
    closeReason: data.reason || null,
    sequence: data.sequence || getStatusRank(data.status || 'Initiated'),
    startTime: null,
    timer: 0,
    timerInterval: null,
    lastEventAt: Date.now(),
  }
}

export const useSmartflowCallStore = defineStore('smartflowCall', {
  state: () => ({
    calls: {},
    activeCallId: null,

    // Backward-compatible fields for existing popup/dialer components.
    isOpen: false,
    callId: null,
    status: null,
    to: null,
    from_number: null,
    leadName: null,
    answeredBy: null,
    closeReason: null,
    startTime: null,
    timer: 0,

    _lastCallId: null,
    _lastLeadName: null,
    _lastTo: null,
  }),

  getters: {
    activeCall(state) {
      if (!state.activeCallId) return null
      return state.calls[state.activeCallId] || null
    },

    activeCalls(state) {
      return Object.values(state.calls)
        .filter((call) => call && call.isOpen)
        .sort((a, b) => (b.lastEventAt || 0) - (a.lastEventAt || 0))
    },
  },

  actions: {
    syncActiveCallState() {
      const activeCall = this.activeCall

      if (!activeCall) {
        this.isOpen = false
        this.callId = null
        this.status = null
        this.to = null
        this.from_number = null
        this.leadName = null
        this.answeredBy = null
        this.closeReason = null
        this.startTime = null
        this.timer = 0
        return
      }

      this.isOpen = !!activeCall.isOpen
      this.callId = activeCall.callId
      this.status = activeCall.status
      this.to = activeCall.to
      this.from_number = activeCall.from_number
      this.leadName = activeCall.leadName
      this.answeredBy = activeCall.answeredBy
      this.closeReason = activeCall.closeReason
      this.startTime = activeCall.startTime
      this.timer = activeCall.timer

      this._lastCallId = activeCall.callId
      if (activeCall.leadName) this._lastLeadName = activeCall.leadName
      if (activeCall.to) this._lastTo = activeCall.to
    },

    ensureCall(callId, payload = {}) {
      if (!callId) return null

      if (!this.calls[callId]) {
        this.calls[callId] = buildCallState({
          call_id: callId,
          ...payload,
        })
      }

      return this.calls[callId]
    },

    shouldApplyEvent(call, payload = {}) {
      const nextSequence = payload.sequence || getStatusRank(payload.status)
      const currentSequence = call.sequence || getStatusRank(call.status)

      if (nextSequence < currentSequence) {
        return false
      }

      if (
        nextSequence === currentSequence &&
        TERMINAL_STATUSES.includes(call.status) &&
        !TERMINAL_STATUSES.includes(payload.status)
      ) {
        return false
      }

      return true
    },

    patchCall(callId, payload = {}) {
      const call = this.ensureCall(callId, payload)
      if (!call) return null
      if (!this.shouldApplyEvent(call, payload)) return call

      call.isOpen = payload.isOpen ?? call.isOpen
      call.status = payload.status || call.status
      call.to = payload.to ?? call.to
      call.from_number = payload.from_number ?? call.from_number
      call.leadName = payload.lead_name || call.leadName || this._lastLeadName
      call.answeredBy = payload.answered_by ?? call.answeredBy ?? null
      call.closeReason = payload.reason ?? call.closeReason ?? null
      call.sequence = payload.sequence || getStatusRank(call.status)
      call.lastEventAt = Date.now()

      if (call.leadName) this._lastLeadName = call.leadName
      if (call.to) this._lastTo = call.to
      this._lastCallId = callId

      return call
    },

    setActiveCall(callId) {
      if (!callId || !this.calls[callId]) return
      this.activeCallId = callId
      this.syncActiveCallState()
      sessionStorage.setItem('sf_active_call_id', callId)
    },

    chooseNextActiveCall(preferredCallId = null) {
      const activeCalls = this.activeCalls
      const preferredCall = preferredCallId ? this.calls[preferredCallId] : null

      if (preferredCall?.isOpen) {
        this.activeCallId = preferredCall.callId
      } else if (activeCalls.length) {
        this.activeCallId = activeCalls[0].callId
      } else {
        this.activeCallId = null
        sessionStorage.removeItem('sf_active_call_id')
      }

      this.syncActiveCallState()
    },

    startTimer(callId) {
      const call = this.calls[callId]
      if (!call || call.timerInterval) return

      call.startTime = Date.now() - (call.timer || 0) * 1000
      call.timerInterval = setInterval(() => {
        const activeCall = this.calls[callId]
        if (!activeCall) return

        activeCall.timer = Math.floor((Date.now() - activeCall.startTime) / 1000)
        if (this.activeCallId === callId) {
          this.timer = activeCall.timer
        }
      }, 1000)

      if (this.activeCallId === callId) {
        this.startTime = call.startTime
      }
    },

    stopTimer(callId) {
      const call = this.calls[callId]
      if (!call || !call.timerInterval) return

      clearInterval(call.timerInterval)
      call.timerInterval = null
    },

    scheduleRemoval(callId, delay = 1500) {
      setTimeout(() => {
        const call = this.calls[callId]
        if (!call) return
        if (!TERMINAL_STATUSES.includes(call.status)) return
        this.removeCall(callId)
      }, delay)
    },

    open(callId, to, leadName = null, from_number = null) {
      this.openCall({
        call_id: callId,
        to,
        lead_name: leadName,
        from_number,
        status: 'Ringing',
      })
    },

    openCall(payload = {}) {
      if (!payload.call_id) return

      const call = this.patchCall(payload.call_id, {
        ...payload,
        isOpen: true,
        status: payload.status || 'Ringing',
      })
      if (!call) return

      if (call.status === 'In Progress') {
        this.startTimer(call.callId)
      }

      this.setActiveCall(call.callId)
    },

    updateCall(payload = {}) {
      if (!payload.call_id) return

      const call = this.patchCall(payload.call_id, payload)
      if (!call) return

      if (call.status === 'In Progress') {
        this.startTimer(call.callId)
      }

      if (TERMINAL_STATUSES.includes(call.status)) {
        this.stopTimer(call.callId)
        call.isOpen = false
        this.chooseNextActiveCall(call.callId)
        this.scheduleRemoval(call.callId)
        return
      }

      this.setActiveCall(call.callId)
    },

    claimCall(payload = {}) {
      if (!payload.call_id) return

      const call = this.patchCall(payload.call_id, {
        ...payload,
        isOpen: true,
        status: payload.status || 'In Progress',
      })
      if (!call) return

      this.startTimer(call.callId)
      this.setActiveCall(call.callId)
    },

    closeCall(payload = {}) {
      if (!payload.call_id) return

      const call = this.patchCall(payload.call_id, {
        ...payload,
        isOpen: false,
        status: payload.status || 'Canceled',
      })
      if (!call) return

      this.stopTimer(call.callId)
      this.chooseNextActiveCall(call.callId)
      this.scheduleRemoval(call.callId)
    },

    terminateCall(payload = {}) {
      if (!payload.call_id) return

      const call = this.patchCall(payload.call_id, {
        ...payload,
        isOpen: false,
        status: payload.status || 'Disconnected',
      })
      if (!call) return

      this.stopTimer(call.callId)
      this.chooseNextActiveCall(call.callId)
      this.scheduleRemoval(call.callId)
    },

    updateStatus(status) {
      if (!this.activeCallId) return
      this.updateCall({
        call_id: this.activeCallId,
        status,
      })
    },

    softReset() {
      const currentActiveCallId = this.activeCallId
      if (currentActiveCallId) {
        this.removeCall(currentActiveCallId, { preserveLastValues: true })
      } else {
        this.isOpen = false
        this.callId = null
        this.status = null
        this.to = null
        this.from_number = null
        this.leadName = null
        this.answeredBy = null
        this.closeReason = null
        this.startTime = null
        this.timer = 0
      }
    },

    removeCall(callId, options = {}) {
      const call = this.calls[callId]
      if (!call) return

      this.stopTimer(callId)

      if (!options.preserveLastValues) {
        if (call.leadName) this._lastLeadName = call.leadName
        if (call.to) this._lastTo = call.to
        this._lastCallId = callId
      }

      delete this.calls[callId]

      if (this.activeCallId === callId) {
        this.activeCallId = null
      }

      this.chooseNextActiveCall()
    },

    reset() {
      Object.keys(this.calls).forEach((callId) => {
        this.stopTimer(callId)
      })

      this.calls = {}
      this.activeCallId = null

      this.isOpen = false
      this.callId = null
      this.status = null
      this.to = null
      this.from_number = null
      this.leadName = null
      this.answeredBy = null
      this.closeReason = null
      this.startTime = null
      this.timer = 0

      this._lastCallId = null
      this._lastLeadName = null
      this._lastTo = null

      sessionStorage.removeItem('sf_active_call_id')
    },
  },
})