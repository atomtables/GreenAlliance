<script>
    import {Permission} from "$lib/types/types";
    import SidebarContent from "$lib/substructure/SidebarContent.svelte";
    import banner1 from "../list/banner1.jpg";
    import {goto, invalidate} from "$app/navigation";
    import Dialog, {alert, confirm} from "$lib/components/Dialog.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import Input from "$lib/components/Input.svelte";
    import Table from "$lib/components/Table.svelte";
    import {formatDate} from "$lib/functions/code.js";

    let {data} = $props();

    let createOpen = $state(false);
    let createError = $state(null);
    let createPromptData = $state({firstName: "", lastName: "", role: -1});

    const createAction = async () => {
        let req = await fetch("/api/users/joincodes", {
            method: "PUT",
            body: JSON.stringify(createPromptData),
            headers: {'Content-Type': 'application/json'}
        })
        let res = await req.json()
        if (!req.ok) {
            createError = res['error'];
            return;
        }
        createOpen = false;
        await invalidate("user:joincodes")
        createPromptData.joinCode = res['data']['joinCode']
        await alert(
            "Successfully Created Join Code",
            `When ${createPromptData.firstName} creates an account, ask them to use this code on the sign up screen.`,
            `<div class="text-5xl font-bold text-center pt-2">${createPromptData.joinCode}</div>`
        )
        createPromptData = {firstName: "", lastName: "", role: -1}
    }
</script>

{#snippet blank()}{/snippet}

{#snippet joincodes()}
    <div class="text-subheader pb-2">
        Active Join Codes
    </div>
    {#await data.joinCodes.active}
        <Spinner/>
    {:then activeJoinCodes}
        <Table source={activeJoinCodes} emptyStr="No join codes are currently active."
               actions={[{ name: "Delete", icon: "delete", action: async (selected, reset) => {
                     let [value, close] = await confirm(
                        "Delete Join Codes",
                        "Are you sure you want to delete these join codes?",
                        `<div>
                            <b class="text-xl">${selected.map(e => activeJoinCodes[e].joinCode).join(", ")}</b>
                            <br>
                            <div>These join codes will be invalidated and will not be able to create a new account.</div>
                        </div>`, true
                    )
                    if (!value) return;
                    let req = await fetch("/api/users/joincodes", {
                        method: "DELETE",
                        body: JSON.stringify(selected.map(e => activeJoinCodes[e].joinCode)),
                        headers: {'Content-Type': 'application/json'}
                    })
                    if (!req.ok) {
                        close();
                        await alert("Failed to Delete Join Codes", "The join codes were unable to be deleted and are still active. Please try again later.")
                        return;
                    }
                    await invalidate("user:joincodes")
                    reset();
                    close();
                    await alert("Successfully Deleted Join Codes", `The join codes have been deleted and are no longer valid to create new accounts.`,)
               }}]}>
            {#snippet header()}
                <th>Join Code</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Created on</th>
            {/snippet}
            {#snippet template({joinCode, firstName, lastName, createdAt})}
                <th class="px-2">{joinCode}</th>
                <th class="px-2">{firstName}</th>
                <th class="px-2">{lastName}</th>
                <th class="px-2">{formatDate(createdAt)}</th>
            {/snippet}
        </Table>
    {/await}
    <div class="text-subheader py-2">
        Previously Used Join Codes
    </div>
    {#await data.joinCodes.used}
        <Spinner/>
    {:then activeJoinCodes}
        <Table
                source={activeJoinCodes}
                emptyStr="No join codes have been used in the last week."
        >
            {#snippet header()}
                <th>Join Code</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Created on</th>
            {/snippet}
            {#snippet template({joinCode, firstName, lastName, createdAt})}
                <th class="px-2">{joinCode}</th>
                <th class="px-2">{firstName}</th>
                <th class="px-2">{lastName}</th>
                <th class="px-2">{formatDate(createdAt)}</th>
            {/snippet}
        </Table>
    {/await}
{/snippet}

<Dialog
        open={createOpen}
        title="Create a join code"
        description="Generate a code to be used for a user to create their account."
        actions={[
            { name: "Cancel", action: () => createOpen = false },
            { name: "Create", action: createAction, primary: true }
        ]}>
    <div class="flex flex-row space-x-2">
        <Input name="First Name" id="firstname" bind:value={createPromptData.firstName}/>
        <Input name="Last Name" id="lastname" bind:value={createPromptData.lastName}/>
    </div>
    <div class="flex flex-row">
        <Input name="Role" id="role" type="dropdown" elements={["Member", "Team Lead", "Captain", "Mentor", "Coach"]}
               bind:value={createPromptData.role}/>
    </div>
    {#if createError}
        <div class="text-red-400">An error occured while creating a join code: <b>{createError}</b></div>
    {/if}
</Dialog>

<SidebarContent
        tabs={[
        { name: "Members", icon: "groups"},
        { name: "Subteams", icon: "diversity_3"},
    ]}
        contents={[
        {
            nested: true,
            nestedTabs: [
                { name: "Roster", icon: "groups" },
                { name: "Join Codes", icon: "link" },
            ],
            nestedContents: [
                {
                    title: "Team Roster",
                    description: "View and modify all members of the team.",
                    content: blank,
                    shelf: [{ name: `Create join code`, action: () => createOpen = true }]
                },
                {
                    title: "Join Codes",
                    description: "Allow users to create an account through the use of a join code.",
                    content: joincodes,
                    shelf: [{ name: `Create join code`, action: () => createOpen = true }]
                },
            ]
        },
        {
            title: "All Subteams",
            content: blank,
            shelf: [data.user.permissions.includes(Permission.users_modify) && { name: "Modify Subteams", action: () => goto("/users/modify") }].filter(val => typeof val !== "boolean")
        }
    ]}
        banner={banner1}
/>

