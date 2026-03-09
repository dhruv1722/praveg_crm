<template>
  <Transition name="dialer-pop">
    <div v-if="store.isOpen" class="sf-wrap">
      <div class="sf-card">
        <!-- Close button -->
        <div class="sf-top">
          <button class="sf-close" @click="store.softReset()" title="Close">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <!-- Avatar -->
        <!-- <div class="sf-avatar">
          <span>{{ avatarText }}</span>
        </div> -->

        <!-- Lead name -->
        <div class="sf-lead-name">{{ store.leadName }}</div>

        <!-- Number -->
        <div class="sf-number">{{ formattedNumber }}</div>

        <!-- Status block -->
        <div class="sf-status-block">
          <div class="sf-pulse-wrap" v-if="isActive">
            <div class="sf-pulse-ring" :class="dotColor"></div>
            <div class="sf-pulse-dot" :class="dotColor"></div>
          </div>
          <div v-else class="sf-static-dot" :class="dotColor"></div>

          <div class="sf-status-label" :class="statusColor">
            {{ statusLabel }}
          </div>

          <!-- Timer — only when connected -->
          <div v-if="store.status === 'In Progress'" class="sf-timer">
            {{ formattedTime }}
          </div>

        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useSmartflowCallStore } from '@/stores/smartflow'

const store = useSmartflowCallStore()

const formattedTime = computed(() => {
  const m = Math.floor(store.timer / 60)
  const s = store.timer % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const formattedNumber = computed(() => {
  const n = String(store.from_number || store.to || '')
  if (n.startsWith('91') && n.length === 12) return '+91 ' + n.slice(2)
  if (n.startsWith('919') && n.length === 13) return '+91 ' + n.slice(2)
  return n
})

const avatarText = computed(() => {
  return typeof store.leadName === 'string'
    ? store.leadName
    : ''
})

const statusLabel = computed(() => {
  const map = {
    'Initiated': 'Ringing...',
    'In Progress': 'Connected',
    'Completed': 'Disconnected',
    'No Answer': 'No Answer',
    'Busy': 'Busy',
    'Canceled': 'Canceled',
    'Failed': 'Failed',
  }
  return map[store.status] || store.status || '...'
})

const statusColor = computed(() => {
  const map = {
    'Initiated': 'color-yellow',
    'Ringing': 'color-yellow',
    'In Progress': 'color-green',
    'Completed': 'color-gray',
    'No Answer': 'color-red',
    'Busy': 'color-red',
    'Canceled': 'color-red',
    'Failed': 'color-red',
  }
  return map[store.status] || 'color-gray'
})

const dotColor = computed(() => {
  const map = {
    'Initiated': 'dot-yellow',
    'Ringing': 'dot-yellow',
    'In Progress': 'dot-green',
    'Completed': 'dot-gray',
    'No Answer': 'dot-red',
    'Busy': 'dot-red',
    'Canceled': 'dot-red',
    'Failed': 'dot-red',
  }
  return map[store.status] || 'dot-gray'
})

const isActive = computed(() =>
  ['Initiated', 'Ringing', 'In Progress'].includes(store.status)
)
</script>

<style scoped>
.dialer-pop-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialer-pop-leave-active {
  transition: all 0.2s ease-in;
}

.dialer-pop-enter-from,
.dialer-pop-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.94);
}

.sf-wrap {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
}

.sf-card {
  width: 240px;
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 20px 20px 24px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.sf-top {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-bottom: -4px;
}

.sf-close {
  background: rgba(255, 255, 255, 0.07);
  border: none;
  color: #71717a;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.sf-close:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.sf-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: 1px;
  margin-top: 4px;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
}

.sf-lead-name {
  font-size: 16px;
  font-weight: 700;
  color: #f4f4f5;
  margin-top: 4px;
  text-align: center;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sf-number {
  font-size: 12px;
  color: #71717a;
  letter-spacing: 0.5px;
}

.sf-status-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.sf-pulse-wrap {
  position: relative;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sf-pulse-ring {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  opacity: 0.25;
  animation: pulse-ring 1.4s ease-out infinite;
}

.sf-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: relative;
  z-index: 1;
}

.sf-static-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 0.3;
  }

  80% {
    transform: scale(2.2);
    opacity: 0;
  }

  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.sf-status-label {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.sf-timer {
  font-size: 26px;
  font-weight: 700;
  color: #22c55e;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
  line-height: 1;
}

.dot-yellow {
  background: #f59e0b;
}

.dot-green {
  background: #22c55e;
}

.dot-red {
  background: #ef4444;
}

.dot-gray {
  background: #52525b;
}

.color-yellow {
  color: #f59e0b;
}

.color-green {
  color: #22c55e;
}

.color-red {
  color: #ef4444;
}

.color-gray {
  color: #71717a;
}
</style>