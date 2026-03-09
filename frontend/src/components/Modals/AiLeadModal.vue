<template>
	<Dialog v-model="show" :options="{ size: '3xl' }">
		<template #body>
			<div class="bg-surface-modal px-4 pb-6 pt-5 sm:px-6">
				<div class="mb-5 flex items-center justify-between">
					<div>
						<h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
							{{ __("Create AI Lead") }}
						</h3>
					</div>
					<div class="flex items-center gap-1">
						<Button
							v-if="isManager() && !isMobileView"
							variant="ghost"
							class="w-7"
							:tooltip="__('Edit fields layout')"
							:icon="EditIcon"
							@click="openQuickEntryModal"
						/>
						<Button variant="ghost" class="w-7" @click="show = false" icon="x" />
					</div>
				</div>
				<div>
					<AiFieldLayout v-if="tabs.data" :tabs="tabs.data" :data="aiLead.doc" />
					<ErrorMessage class="mt-4" v-if="error" :message="__(error)" />
				</div>
			</div>
			<div class="px-4 pb-7 pt-4 sm:px-6">
				<div class="flex flex-row-reverse gap-2">
					<Button
						variant="solid"
						:label="__('Create')"
						:loading="isLeadCreating"
						@click="createNewLead"
					/>
				</div>
			</div>
		</template>
	</Dialog>
</template>

<script setup>
import EditIcon from "@/components/Icons/EditIcon.vue";
import AiFieldLayout from "@/components/FieldLayout/AiFieldLayout.vue";
import { usersStore } from "@/stores/users";
import { statusesStore } from "@/stores/statuses";
import { isMobileView } from "@/composables/settings";
import { showQuickEntryModal, quickEntryProps } from "@/composables/modals";
import {  useTelemetry } from "frappe-ui/frappe";
import { createResource } from "frappe-ui";
import { useDocument } from "@/data/document";
import { computed,  ref, nextTick } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
	defaults: Object,
});

const { isManager } = usersStore();
const { getLeadStatus, statusOptions } = statusesStore();

const show = defineModel();
const router = useRouter();
const error = ref(null);
const isLeadCreating = ref(false);

const { document: aiLead, triggerOnBeforeCreate } = useDocument("AI Leads");

const { capture } = useTelemetry();

const leadStatuses = computed(() => {
	let statuses = statusOptions("aiLead");
	if (!aiLead.doc.status) {
		aiLead.doc.status = statuses?.[0]?.value;
	}
	return statuses;
});

const tabs = createResource({
	url: "crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout",
	cache: ["QuickEntry", "AI Leads"],
	params: { doctype: "AI Leads", type: "Quick Entry" },
	auto: true,
	transform: (_tabs) => {
		_tabs.forEach((tab) => {
			tab.sections.forEach((section) => {
				section.columns.forEach((column) => {
					column.fields.forEach((field) => {
						if (field.fieldname == "status") {
							field.fieldtype = "Select";
							field.options = leadStatuses.value;
							field.prefix = getLeadStatus(aiLead.doc.status).color;
						}

						if (field.fieldtype === "Table") {
							aiLead.doc[field.fieldname] = [];
						}
						
						// CRITICAL: Initialize field with default value
						if (!(field.fieldname in aiLead.doc)) {
							aiLead.doc[field.fieldname] = field.default || "";
						}
					});
				});
			});
		});
		return _tabs;
	},
});

const createLead = createResource({
	url: "frappe.client.insert",
});

async function createNewLead() {
	await triggerOnBeforeCreate?.();

	createLead.submit(
		{
			doc: {
				doctype: "AI Leads",
				...aiLead.doc,
			},
		},
		{
			validate() {
				error.value = null;
				if (!aiLead.doc.first_name) {
					error.value = __("First name is mandatory");
					return error.value;
				}
				if (aiLead.doc.mobile && isNaN(aiLead.doc.mobile.replace(/[-+() ]/g, ""))) {
					error.value = __("Mobile should be a number");
					return error.value;
				}
				if (aiLead.doc.email && !aiLead.doc.email.includes("@")) {
					error.value = __("Invalid email address");
					return error.value;
				}
				isLeadCreating.value = true;
			},
			onSuccess(data) {
				capture("lead_created");
				isLeadCreating.value = false;
				show.value = false;
				router.push({ name: "AI Lead", params: { aiLeadId: data.name } });
			},
			onError(err) {
				isLeadCreating.value = false;
				if (!err.messages) {
					error.value = err.message;
					return;
				}
				error.value = err.messages.join("\n");
			},
		},
	);
}

function openQuickEntryModal() {
	showQuickEntryModal.value = true;
	quickEntryProps.value = { doctype: "AI Leads" };
	nextTick(() => (show.value = false));
}

</script>