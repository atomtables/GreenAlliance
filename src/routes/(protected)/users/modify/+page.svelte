<script>
    import {Permission} from "$lib/types/types";
    import SidebarContent from "$lib/substructure/SidebarContent.svelte";
    import banner1 from "../list/banner1.jpg";
    import {goto, invalidate} from "$app/navigation";
    import Dialog from "$lib/components/Dialog.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import Input from "$lib/components/Input.svelte";

    let {data} = $props();

    let createOpen = $state(false);
    let createError = $state(null);
    let createCompleteOpen = $state(false);
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
        createCompleteOpen = true;
    }

    const formatDate = date => {
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
        })
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
        <table class="bg-gray-700 w-full text-left">
            <thead>
            <tr class="border-b-2 border-gray-400">
                <th class="w-8 px-2">
                    <Input type="checkbox"/>
                </th>
                <th class="text-gray-200 px-2">
                    Join Code
                </th>
                <th class="text-gray-200 px-2">
                    First Name
                </th>
                <th class="text-gray-200 px-2">
                    Last Name
                </th>
                <th class="text-gray-200 px-2">
                    Created on
                </th>
            </tr>
            </thead>
            <tbody>
            {#if activeJoinCodes.length > 0}
                {#each activeJoinCodes as {firstName, lastName, joinCode, createdAt}}
                    <tr class="text-white">
                        <th class="w-8 px-2"><Input type="checkbox"/></th>
                        <th class="px-2">{joinCode}</th>
                        <th class="px-2">{firstName}</th>
                        <th class="px-2">{lastName}</th>
                        <th class="px-2">{formatDate(createdAt)}</th>
                    </tr>
                {/each}
            {:else}
                <tr>
                    <th></th>
                    <th class="px-2 py-2"><i>No join codes were used in the last week.</i></th>
                </tr>
            {/if}
            </tbody>
        </table>
    {/await}
    <div class="text-subheader py-2">
        Previously Used Join Codes
    </div>
    {#await data.joinCodes.used}
        <Spinner/>
    {:then activeJoinCodes}
        <table class="bg-gray-700 w-full text-left">
            <thead>
            <tr class="border-b-2 border-gray-400">
                <th class="w-8 px-2">
                    <Input type="checkbox"/>
                </th>
                <th class="text-gray-200 px-2">
                    Join Code
                </th>
                <th class="text-gray-200 px-2">
                    First Name
                </th>
                <th class="text-gray-200 px-2">
                    Last Name
                </th>
                <th class="text-gray-200 px-2">
                    Created on
                </th>
            </tr>
            </thead>
            <tbody>
            {#if activeJoinCodes.length > 0}
                {#each activeJoinCodes as {firstName, lastName, joinCode, createdAt}}
                    <tr class="text-white">
                        <th class="w-8 px-2"><Input type="checkbox"/></th>
                        <th class="px-2">{joinCode}</th>
                        <th class="px-2">{firstName}</th>
                        <th class="px-2">{lastName}</th>
                        <th class="px-2">{formatDate(createdAt)}</th>
                    </tr>
                {/each}
            {:else}
                <tr>
                    <th></th>
                    <th class="px-2 py-2"><i>No join codes were used in the last week.</i></th>
                </tr>
            {/if}
            </tbody>
        </table>
    {/await}
{/snippet}

<Dialog
        open={createOpen}
        title="Create a join code"
        description="Generate a code to be used for a user to create their account."
        actions={[{ name: "Cancel", action: () => createOpen = false }, { name: "Create", action: createAction, primary: true }]}>
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

<Dialog
        open={createCompleteOpen}
        title="Successfully Created Join Code"
        description="When {createPromptData.firstName} creates an account, ask them to use this code on the sign up screen."
        actions={[{ name: "OK", action: () => { createCompleteOpen = false; createPromptData = {firstName: "", lastName: "", role: -1};}, primary: true }]}>
    <div class="text-5xl font-bold text-center pt-2">{createPromptData.joinCode}</div>
</Dialog>

<SidebarContent
        tabs={[
        { name: "Join Codes", icon: "link" },
        { name: "Subteams", icon: "diversity_3"},
    ]}
        contents={[
        {
            title: "Join Codes",
            description: "Allow users to create an account through the use of a join code.",
            content: joincodes,
            shelf: [{ name: `Create join code`, action: () => createOpen = true }]
        },
        {
            title: "All Subteams",
            content: blank,
            shelf: [data.user.permissions.includes(Permission.users_modify) && { name: "Modify Subteams", action: () => goto("/users/modify") }].filter(val => typeof val !== "boolean")
        }
    ]}
        banner={banner1}
/>

