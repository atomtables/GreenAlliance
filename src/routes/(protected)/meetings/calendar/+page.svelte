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

	const toLocalISOString = (date: Date) => {
		const offset = date.getTimezoneOffset() * 60000; // offset in milliseconds
		const localISOTime = new Date(date.getTime() - offset)
			.toISOString()
			.slice(0, 16);
		return localISOTime;
	};

	const members = data.users;
	const { editAccess } = data;

	let createNewEventOpen = $state(false);
	let customMemberInvite = $state(false);
	let selectedMeetingOpen = $state(false);
	let selectedMeeting = $state("");
	let selectedMeetingPresent = $state([]);
	let selectedMeetingStatus = $state("");
	let selectedMeetingPassed = $state(false);
	let selectedMeetingStatuses = $state({});
	let date = $state(toLocalISOString(today));
	let title = $state("");
	let description = $state("");
	let durationMinutes = $state(60);
	let subteams = $state([]);
	let selectedMembers = $state(new Array(members.length).fill(false));
	let formError = $state();

	const meetings = data.meetings.sort(
		(a, b) => a.dateOf.getTime() - b.dateOf.getTime(),
	);

	const createNewEvent = async () => {
		const dateObj = new Date(date);

		const cleanedMembers = $state
			.snapshot(selectedMembers)
			.map((isSelected, index) => (isSelected ? members[index].id : null))
			.filter((id) => id !== null);

		const payload = {
			title,
			description,
			date: dateObj,
			durationMinutes,
			applicableSubteams: $state.snapshot(subteams),
			members: cleanedMembers,
		};

		if (selectedMeeting !== "") {
			let res = await fetch("/api/meetings/" + selectedMeeting, {
				method: "PATCH",
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				let json = await res.json();
				formError = "There was an error loading data. " + json.error;
				return;
			}

			selectedMeeting = "";
			let json = await res.json();
			if (json.success) {
				invalidate("meetings:events");
				createNewEventOpen = false;
				await alert("Edit meeting", "Successfully edited your event!");
				return;
			} else {
				await alert(
					"There was an error submitting your request. Try again later.",
				);
			}
			return;
		}

		let res = await fetch("/api/meetings", {
			method: "PUT",
			body: JSON.stringify(payload),
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

	const editEvent = async (meetingId: string) => {
		let res = await fetch("/api/meetings/" + meetingId);

		if (!res.ok) {
			let json = await res.json();
			formError = "There was an error loading data. " + json.error;
			return;
		}

		let json = await res.json();

		let meetingData = json.data;

		title = meetingData.title;
		description = meetingData.description;
		date = toLocalISOString(new Date(meetingData.dateOf));
		durationMinutes = meetingData.durationMinutes;
		subteams = meetingData.subteams;
		for (let i = 0; i < members.length; i++) {
			selectedMembers[i] = meetingData.members.includes(members[i].id);
		}

		createNewEventOpen = true;
		selectedMeeting = meetingId;
	};

	const removeEvent = async (meetingId: string) => {
		let res = await fetch("/api/meetings/" + meetingId, {
			method: "DELETE",
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

	const toggleSubteam = (subteam: string) => {
		if (subteams.includes(subteam)) {
			subteams = subteams.filter((s) => s !== subteam);
		} else {
			subteams = [...subteams, subteam];
		}
		for (let i = 0; i < members.length; i++) {
			let found = false;
			if (members[i].subteam === "All" && subteams.length > 0) {
				found = true;
			}
			for (let j = 0; j < subteams.length; j++) {
				if (subteams[j] === "All") {
					found = true;
					break;
				} else if (members[i].subteam === subteams[j]) {
					found = true;
					break;
				}
			}
			selectedMembers[i] = found;
		}
	};

	const getAttendance = async () => {
		let res = await fetch("/api/meetingAttendees/" + selectedMeeting);
		if (!res.ok) {
			return [];
		}
		let json = await res.json();
		const userIds = json.userIds;

		const newAttendance = selectedMembers.map((member) =>
			userIds.includes(member.id),
		);

		selectedMeetingPresent = newAttendance;
		selectedMeetingStatuses = json.statusMap;
	};

	const saveAttendance = async () => {
		let payload = [];
		for (let i = 0; i < selectedMembers.length; i++) {
			if (selectedMeetingPresent[i]) {
				payload.push(selectedMembers[i].id);
			}
		}

		let res = await fetch("/api/meetingAttendees/" + selectedMeeting, {
			method: "POST",
			body: JSON.stringify({ userIds: payload }),
		});

		if (!res.ok) {
			await alert(
				"There was an error submitting your request. Try again later.",
			);
			return;
		}

		let json = await res.json();
		if (json.success) {
			await alert(
				"Save attendance",
				"Successfully saved attendance for the event!",
			);
			return;
		} else {
			await alert(
				"There was an error submitting your request. Try again later.",
			);
		}
	};

	const getStatus = async () => {
		let res = await fetch(
			"/api/meetingAttendees/status/" + selectedMeeting,
		);
		if (!res.ok) {
			return;
		}
		let json = await res.json();
		selectedMeetingStatus = json.userStatus;
	};

	const updateStatus = async () => {
		let res = await fetch(
			"/api/meetingAttendees/status/" + selectedMeeting,
			{
				method: "POST",
				body: JSON.stringify({ status: selectedMeetingStatus }),
			},
		);

		if (!res.ok) {
			await alert(
				"There was an error submitting your request. Try again later.",
			);
			return;
		}

		let json = await res.json();
		if (json.success) {
			await alert(
				"Update attendance status",
				"Successfully updated your attendance status for the event!",
			);
			return;
		} else {
			await alert(
				"There was an error submitting your request. Try again later.",
			);
		}
	};

	const getAdminDialogActions = () => {
		if (selectedMeetingPassed) {
			return [
				{
					name: "Close",
					action: () => (selectedMeetingPresent.length = 0),
					close: true,
				},
				{
					name: "Save Changes",
					action: saveAttendance,
					primary: true,
					close: true,
				},
			];
		} else {
			return [{ name: "Close", action: () => null, close: true }];
		}
	};
</script>

<Dialog
	bind:open={createNewEventOpen}
	title="Create a new meeting"
	description=""
	actions={[
		{
			name: "Cancel",
			action: () => {
				selectedMeeting = "";
			},
			close: true,
		},
		{ name: "Submit", close: true, primary: true, action: createNewEvent },
	]}
>
	<Input name="Name" bind:value={title} />
	<Input name="Description" bind:value={description} />
	<div class="flex flex-row items-end gap-2 my-2">
		<div class="flex-1">
			<Input type="datetime-local" name="Date" bind:value={date} />
		</div>

		<div class="w-32">
			<Input
				type="number"
				name="Duration (minutes)"
				bind:value={durationMinutes}
			/>
		</div>
	</div>
	<div class="flex flex-col">
		<h2 class="pl-1">Applicable to subteams:</h2>
		<div class="flex flex-row gap-4 flex-wrap">
			{#each data.subteams as subteam}
				<div class="flex flex-row gap-1 justify-center items-center">
					<Input
						type="checkbox"
						checked={subteams.includes(subteam.name)}
						onchange={() => toggleSubteam(subteam.name)}
					/>
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
				actions={[{ name: "Close", action: () => null, close: true }]}
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

{#if editAccess}
	<Dialog
		bind:open={selectedMeetingOpen}
		{title}
		{description}
		actions={getAdminDialogActions()}
	>
		<div class="flex flex-col gap-2 mb-4">
			<div>
				<span class="font-bold">Date: </span>
				{new Date(date).toLocaleString()}
			</div>
			<div>
				<span class="font-bold">Subteams: </span>
				{subteams.length > 0 ? subteams.join(", ") : "None"}
			</div>
		</div>
		<div class="flex flex-col gap-2 mb-4">
			<h1 class="pl-1">Select Members Present:</h1>
		</div>
		{#if selectedMeetingPassed}
			<Table
				source={selectedMembers}
				bind:selected={selectedMeetingPresent}
			>
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
												: "?"}
					</th>
				{/snippet}
			</Table>
		{:else}
			<Table source={selectedMembers} checkable={false}>
				{#snippet header()}
					<th>Name</th>
					<th>Status</th>
				{/snippet}
				{#snippet template({ firstName, lastName, id }, index)}
					<th class="px-2">{firstName + " " + lastName}</th>
					<th class="px-2">
						{selectedMeetingStatuses?.[id] === "yes"
							? "Yes"
							: selectedMeetingStatuses?.[id] === "no"
								? "No"
								: selectedMeetingStatuses?.[id] === "maybe"
									? "Maybe"
									: "No Response"}
					</th>
				{/snippet}
			</Table>
		{/if}
	</Dialog>
{:else}
	<Dialog
		bind:open={selectedMeetingOpen}
		{title}
		{description}
		actions={[{ name: "Close", action: () => null, close: true }]}
	>
		<div class="flex flex-col gap-2 mb-4">
			<div>
				<span class="font-bold">Date: </span>
				{new Date(date).toLocaleString()}
			</div>
			<div>
				<span class="font-bold">Subteams: </span>
				{subteams.length > 0 ? subteams.join(", ") : "None"}
			</div>
			<div>
				<span class="font-bold">Members Invited: </span>
				{selectedMembers.length > 0
					? selectedMembers
							.map((m) => m.firstName + " " + m.lastName)
							.join(", ")
					: "None"}
			</div>

			<div class="flex flex-col">
				<h2 class="pl-1">Are you able to attend?</h2>
				<div class="flex flex-row gap-4 flex-wrap">
					<Button
						onclick={() => {
							selectedMeetingStatus = "yes";
							updateStatus();
						}}
						class={selectedMeetingStatus === "yes"
							? ""
							: "bg-gray-500 cursor-not-allowed hover:bg-gray-400"}
					>
						Yes
					</Button>
					<Button
						onclick={() => {
							selectedMeetingStatus = "no";
							updateStatus();
						}}
						class={selectedMeetingStatus === "no"
							? ""
							: "bg-gray-500 cursor-not-allowed hover:bg-gray-400"}
					>
						No
					</Button>
					<Button
						onclick={() => {
							selectedMeetingStatus = "maybe";
							updateStatus();
						}}
						class={selectedMeetingStatus === "maybe"
							? ""
							: "bg-gray-500 cursor-not-allowed hover:bg-gray-400"}
					>
						Maybe
					</Button>
				</div>
			</div>
		</div>
	</Dialog>
{/if}

<div class="w-full h-full p-10">
	<div class="bg-slate-600 w-full h-full flex flex-col overflow-y-scroll">
		<div
			class="font-bold text-2xl px-5 pt-5 flex flex-row flex-nowrap gap-2 justify-between items-center"
		>
			<span>
				{today.toMonthString()}
				{today.getFullYear()}
			</span>
			<IconButton
				onclick={() => {
					createNewEventOpen = true;
					title = "";
					description = "";
					date = toLocalISOString(today);
					subteams = [];
					selectedMembers = new Array(members.length).fill("");
					formError = "";
				}}
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
					{#each meetings as meeting}
						{#if meeting.dateOf.getMonth() === today.getMonth() && meeting.dateOf.getDate() === i + 1}
							<div
								class="bg-orange-800 w-full text-sm font-bold p-1 rounded-md cursor-pointer hover:bg-orange-700 transition-colors duration-200 line-clamp-3 break-all max-h-16"
								onclick={async () => {
									selectedMeetingOpen = true;
									title = meeting.title;
									description = meeting.description;
									date = toLocalISOString(meeting.dateOf);
									subteams = meeting.subteams;
									selectedMeeting = meeting.id;
									selectedMembers = [];
									selectedMeetingStatuses = {};
									if (meeting.dateOf < new Date()) {
										selectedMeetingPassed = true;
									} else {
										selectedMeetingPassed = false;
									}
									for (let i = 0; i < members.length; i++) {
										if (
											meeting.members.includes(
												members[i].id,
											)
										) {
											selectedMembers.push(members[i]);
										}
									}
									if (editAccess) {
										await getAttendance();
									} else {
										await getStatus();
									}
								}}
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
										-
										{new Date(
											meeting.dateOf.getTime() +
												meeting.durationMinutes *
													60 *
													1000,
										).toLocaleTimeString(undefined, {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
									<span class="font-light">
										{meeting.title}
									</span>
									{#if editAccess}
										<div
											class="flex flex-row justify-end space-x-2"
										>
											<IconButton
												onclick={(e) => {
													e.stopPropagation();
													editEvent(meeting.id);
												}}
											>
												<span
													class="material-symbols-outlined icons-fill !text-sm"
												>
													edit
												</span>
											</IconButton>
											<IconButton
												onclick={(e) => {
													e.stopPropagation();
													removeEvent(meeting.id);
												}}
											>
												<span
													class="material-symbols-outlined icons-fill !text-sm"
													>delete</span
												>
											</IconButton>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>
