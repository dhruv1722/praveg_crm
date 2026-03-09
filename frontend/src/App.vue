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
import { computed, defineAsyncComponent, onMounted } from 'vue'
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

/* ---------------- Call Update ---------------- */
function handleCallUpdate(data) {
  if (!data?.call_id) return

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
    callStore.updateStatus(data.status)
  } else if (!callStore.isOpen && data.status === 'Ringing') {
    callStore.open(
      data.call_id,
      data.to,
      data.lead_name || 'Unknown',
      data.from_number
    )
    callStore.updateStatus(data.status)
  }

  if (data.status === 'Disconnected') {
    setTimeout(() => {
      callStore.reset()
    }, 1500)
  }

}


/* ---------------- Socket Setup ---------------- */

function registerSocketEvents(socket) {
  console.error('registerSocketEvents called. connected=', socket.connected)

  if (!socket.__hasAnyLogger) {
    socket.__hasAnyLogger = true
    socket.onAny((event, payload) => {
      console.error('SOCKET ANY:', event, payload)
    })
  }
  socket.off('smartflo_call_update', handleCallUpdate)
  socket.on('smartflo_call_update', handleCallUpdate)
}

// onMounted(() => {
//   const { $socket } = globalStore()
//   if (!$socket) return
//   console.error("SOCKET CONNECTED?", $socket.connected, "id=", $socket.id)
//   if ($socket.connected) {
//     registerSocketEvents($socket)
//   } else {
//     $socket.on('connect', () => registerSocketEvents($socket))
//   }
// })


onMounted(() => {
  console.log('onMounted 1');
  const { $socket } = globalStore()
  if (!$socket) return
  console.error("SOCKET CONNECTED?", $socket.connected, "id=", $socket.id)
  console.log('onMounted 2');
  window.__socket = $socket
  const onConnect = () => registerSocketEvents($socket)
  console.log('onMounted 3');
  if ($socket.connected) {
    onConnect()
    console.log('onMounted 4');
  } else {
    console.log('onMounted 5');
    // ensure connect handler is not duplicated
    $socket.off('connect', onConnect)
    $socket.on('connect', onConnect)
  }
})

onBeforeUnmount(() => {
    console.log('onBeforeUnmount 1');
  const { $socket } = globalStore()
  if (!$socket) return
    console.log('onBeforeUnmount 2');
  $socket.off('smartflo_call_update', handleCallUpdate)
})



/* ---------------- Timezone Config ---------------- */

setConfig('systemTimezone', window.timezone?.system || null)
setConfig('localTimezone', window.timezone?.user || null)
</script>