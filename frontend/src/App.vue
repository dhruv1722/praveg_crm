<template>
  <FrappeUIProvider>
    <NotPermitted v-if="$route.name === 'Not Permitted'" />
    <Layout class="isolate" v-else-if="session().isLoggedIn">
      <router-view :key="$route.fullPath" />
      <SmartflowDialer />
    </Layout>
    <Dialogs />
    <EventNotificationPopup />
  </FrappeUIProvider>
</template>

<script setup>
import NotPermitted from '@/pages/NotPermitted.vue'
import EventNotificationPopup from '@/components/EventNotificationPopup.vue'
import { Dialogs } from '@/utils/dialogs'
import { sessionStore as session } from '@/stores/session'
import { FrappeUIProvider, setConfig } from 'frappe-ui'
import { computed, defineAsyncComponent ,onMounted } from 'vue'
import { useSmartflowCallStore } from '@/stores/smartflow'

const callStore = useSmartflowCallStore()

/* ---------------- Layout ---------------- */

const MobileLayout = defineAsyncComponent(() =>
  import('./components/Layouts/MobileLayout.vue')
)

const DesktopLayout = defineAsyncComponent(() =>
  import('./components/Layouts/DesktopLayout.vue')
)

const Layout = computed(() =>
  window.innerWidth < 640 ? MobileLayout : DesktopLayout
)

/* ---------------- Force Close Timer ---------------- */

let closeTimer = null

function forceCloseAfter7Sec() {
  if (closeTimer) clearTimeout(closeTimer)

  closeTimer = setTimeout(() => {
    callStore.softReset?.() || callStore.reset?.()
  }, 7000)
}

/* ---------------- Call Update ---------------- */
function handleCallUpdate(data) {
  if (!data?.call_id) return

  const savedCallId = sessionStorage.getItem('sf_active_call_id')
  if (!savedCallId || savedCallId !== data.call_id) return

  const terminalStatuses = [
    'Completed',
    'Failed',
    'No Answer',
    'Busy',
    'Canceled',
  ]

  if (terminalStatuses.includes(data.status)) {
    sessionStorage.removeItem('sf_active_call_id')
  }

  if (callStore.isOpen && callStore.callId === data.call_id) {
    // callStore.updateStatus(data.status)
  } else if (!callStore.isOpen) {
    callStore.open(data.call_id, data.to, null)
    // callStore.updateStatus(data.status)
  }

  forceCloseAfter7Sec()
}

/* ---------------- Incoming Call ---------------- */

function handleIncomingCall(data) {
  if (!data?.call_id) return

  callStore.open(
    data.call_id,
    data.from_number,
    data.lead_name || null
  )

  sessionStorage.setItem('sf_active_call_id', data.call_id)

  forceCloseAfter7Sec()
}

/* ---------------- Socket Setup ---------------- */

function registerSocketEvents(socket) {
  socket.off('smartflo_call_update', handleCallUpdate)
  socket.off('smartflow_incoming_call', handleIncomingCall)

  socket.on('smartflo_call_update', handleCallUpdate)
  socket.on('smartflow_incoming_call', handleIncomingCall)
}

onMounted(() => {
  const { $socket } = globalStore()
  if (!$socket) return

  if ($socket.connected) {
    registerSocketEvents($socket)
  } else {
    $socket.on('connect', () => registerSocketEvents($socket))
  }
})

/* ---------------- Timezone Config ---------------- */

setConfig('systemTimezone', window.timezone?.system || null)
setConfig('localTimezone', window.timezone?.user || null)
</script>