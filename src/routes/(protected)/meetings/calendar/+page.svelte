<script lang="ts">
	import { invalidate } from "$app/navigation";
	import Dialog from "$lib/components/Dialog.svelte";
	import IconButton from "$lib/components/IconButton.svelte";
	import Input from "$lib/components/Input.svelte";
	import { onMount } from "svelte";
	import { alert } from "$lib/components/Dialog.svelte";
	import Button from "$lib/components/Button.svelte";
	import Table from "$lib/components/Table.svelte";
	import { Role } from "$lib/types/types";

	let { data } = $props();
	let today = new Date();

	let createNewEventOpen = $state(false);
	let customMemberInvite = $state(false);
	let date = $state(
		`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T12:00`,
	);
	let title = $state();
	let description = $state();
	let subteams = $state({});
	let selectedMembers = $state([]);
	let formError = $state();

	const members = data.users;
	console.log(members);

	const createNewEvent = async () => {
		let res = await fetch("/api/meetings", {
			method: "PUT",
			body: JSON.stringify({
				title,
				description,
				date: new Date(date),
				// @ts-ignore
				applicableSubteams: Object.entries(subteams)
					.flatMap(([k, v]) => v && parseInt(k))
					.filter((v) => v === false),
			}),
		});
		if (!res.ok) {
			let json = await res.json();
			formError = "There was an error loading data. " + json.error;
			return;
		}
		let json = await res.json();
		if (json.success) {
			invalidate("meetings:events");
			await alert(
				"Create a new meeting",
				"Successfully made your new event!",
			);
			return;
		} else {
			await alert(
				"There was an error submitting your request. Try again later.",
			);
		}
	};
	const removeEvent = async (meetingId: number) => {
		let res = await fetch("/api/meetings", {
			method: "DELETE",
			body: JSON.stringify({ meetingId }),
		});
		if (!res.ok) {
			let json = await res.json();
			formError = "There was an error loading data. " + json.error;
			return;
		}
		let json = await res.json();
		if (json.success) {
			invalidate("meetings:events");
			await alert("Delete meeting", "Successfully deleted the event!");
			return;
		} else {
			await alert(
				"There was an error submitting your request. Try again later.",
			);
		}
	};
</script>

<Dialog
	bind:open={createNewEventOpen}
	title="Create a new meeting"
	description=""
	actions={[
		{ name: "Cancel", action: () => null, close: true },
		{ name: "Submit", close: true, primary: true, action: createNewEvent },
	]}
>
	<Input name="Name" bind:value={title} />
	<Input name="Description" bind:value={description} />
	<Input type="datetime-local" name="Date" bind:value={date} />
	<div class="flex flex-col">
		<h2 class="pl-1">Applicable to subteams:</h2>
		<div class="flex flex-row gap-4 flex-wrap">
			{#each data.subteams as subteam, i}
				<div class="flex flex-row gap-1 justify-center items-center">
					<Input type="checkbox" bind:value={subteams[i]} />
					<span>{subteam.name}</span>
				</div>
			{/each}
			<Button
				onclick={() => {
					customMemberInvite = true;
				}}
			>
				Custom
			</Button>
			<Dialog
				bind:open={customMemberInvite}
				title="Custom member invite"
				description="Select specific members to invite to this meeting. (This overrides subteam selection)"
				actions={[
					{ name: "Close", action: () => null, close: true },
					{
						name: "Save",
						action: () => {
							customMemberInvite = false;
						},
						close: true,
					},
				]}
			>
				<Table source={members} bind:selected={selectedMembers}>
					{#snippet header()}
						<th>Name</th>
						<th>Role</th>
					{/snippet}
					{#snippet template({ firstName, lastName, role })}
						<th class="px-2">{firstName + " " + lastName}</th>
						<th class="px-2"
							>{role === Role.administrator
								? "adm."
								: role === Role.coach
									? "coa."
									: role === Role.mentor
										? "ment."
										: role === Role.captain
											? "capt."
											: role === Role.lead
												? "lead."
												: role === Role.member
													? "mem."
													: "?"}</th
						>
					{/snippet}
				</Table>
			</Dialog>
		</div>
		<div class="text-red-500">
			{formError}
		</div>
	</div>
</Dialog>

<div class="w-full h-full p-10">
	<div class="bg-slate-600 w-full h-full flex flex-col overflow-y-scroll">
		<div
			class="font-bold text-2xl px-5 pt-5 flex flex-row flex-nowrap gap-2 justify-between items-center"
		>
			<span>
				{today.toMonthString()}
				{today.getFullYear()}
			</span>
			<IconButton onclick={() => (createNewEventOpen = true)}
				><span class="material-symbols-outlined icons-fill">add</span
				></IconButton
			>
		</div>
		<div class="flex flex-wrap px-5 pt-5">
			{#each ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as date}
				<div
					class="basis-1/7 text-center uppercase text-subheader pb-2"
				>
					{date}
				</div>
			{/each}
		</div>
		<div
			class="grid grid-cols-7 m-5 mt-0 border-2 border-neutral-500 bg-neutral-600"
		>
			{#each [...Array(today.daysInMonth()).keys()] as num, i}
				<div
					class="basis-1/7 w-full border-2 border-neutral-500 bg-neutral-600 aspect-square overflow-none"
				>
					<div class="font-bold text-2xl p-2">
						{i + 1}
					</div>
					{#each data.meetings as meeting}
						{#if meeting.dateOf.getMonth() === today.getMonth() && meeting.dateOf.getDate() === i + 1}
							<div
								class="bg-orange-800 w-full text-sm font-bold p-1"
							>
								<div class="line-clamp-1 break-all max-w-full">
									<span class="font-bold">
										{meeting.dateOf.toLocaleTimeString(
											undefined,
											{
												hour: "2-digit",
												minute: "2-digit",
											},
										)}
									</span>
									<span class="font-light">
										{meeting.title}
									</span>
									<IconButton
										onclick={() => removeEvent(meeting.id)}
									>
										{console.log(meeting.id)}
										<span
											class="material-symbols-outlined icons-fill !text-sm"
											>delete</span
										>
									</IconButton>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>
