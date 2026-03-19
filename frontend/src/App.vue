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
import SmartflowDialer from '@/components/Telephony/SmartflowDialer.vue'
import { Dialogs } from '@/utils/dialogs'
import { sessionStore as session } from '@/stores/session'
import { globalStore } from '@/stores/global'
import { FrappeUIProvider, setConfig } from 'frappe-ui'
import { computed, defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'
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

/* ---------------- Helpers ---------------- */

const terminalStatuses = [
  'Completed',
  'Disconnected',
  'Failed',
  'No Answer',
  'Busy',
  'Canceled',
]

function clearSessionStorageForCall(callId) {
  if (!callId) return

  const currentActiveCallId = sessionStorage.getItem('sf_active_call_id')
  if (currentActiveCallId === callId) {
    sessionStorage.removeItem('sf_active_call_id')
  }
}

/* ---------------- Call Update ---------------- */

function handleCallUpdate(data) {
  if (!data?.call_id) return

  const action = data.action || 'update'

  if (terminalStatuses.includes(data.status)) {
    clearSessionStorageForCall(data.call_id)
  }

  switch (action) {
    case 'open':
      callStore.openCall(data)
      break

    case 'claim':
      callStore.claimCall(data)
      break

    case 'close':
      callStore.closeCall(data)
      break

    case 'terminate':
      callStore.terminateCall(data)
      break

    case 'update':
    default:
      callStore.updateCall(data)
      break
  }
}

/* ---------------- Socket Setup ---------------- */

function registerSocketEvents(socket) {
  socket.off('smartflo_call_update', handleCallUpdate)
  socket.on('smartflo_call_update', handleCallUpdate)
}

function unregisterSocketEvents(socket) {
  if (!socket) return
  socket.off('smartflo_call_update', handleCallUpdate)
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

onBeforeUnmount(() => {
  const { $socket } = globalStore()
  unregisterSocketEvents($socket)
})

/* ---------------- Timezone Config ------------------ */

setConfig('systemTimezone', window.timezone?.system || null)
setConfig('localTimezone', window.timezone?.user || null)
</script>
