<script lang="ts">
    import { Permission, Role, type User as UserType } from "$lib/types/types";
    import SidebarContent from "$lib/substructure/SidebarContent.svelte";
    import { goto, invalidate } from "$app/navigation";
    import Dialog, {
        alert,
        confirm,
        wait,
    } from "$lib/components/Dialog.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import Input from "$lib/components/Input.svelte";
    import Table from "$lib/components/Table.svelte";
    import { formatDate } from "$lib/functions/code.js";
    import SubteamComponent from "./SubteamComponent.svelte";
    import { RosterExporter } from "$lib/RosterExporter";
    import User from "$lib/components/User.svelte";
    import { PUBLIC_TEAM_NAME } from "$env/static/public";

    let { data } = $props();
    let printRosterOpen = $state(false);
    let type: number = $state();
    let sort: number = $state();

    let createJoinCodeOpen = $state(false);
    let createError = $state(null);
    let createPromptData = $state({
        firstName: "",
        lastName: "",
        role: -1,
        subteam: -1,
        joinCode: null,
    });

    const createJoinCode = async () => {
        if (
            !createPromptData.firstName ||
            !createPromptData.lastName ||
            createPromptData.role === -1 ||
            data.subteams[createPromptData.subteam]?.name === undefined
        ) {
            alert("Create a join code", "Please fill out all fields.");
            return;
        }

        let req = await fetch("/api/users/joincodes", {
            method: "PUT",
            body: JSON.stringify({
                firstName: createPromptData.firstName,
                lastName: createPromptData.lastName,
                role: createPromptData.role,
                subteam: data.subteams[createPromptData.subteam].name,
            }),
            headers: { "Content-Type": "application/json" },
        });
        let res = await req.json();
        if (!req.ok) {
            createError = res["error"];
            return;
        }
        createJoinCodeOpen = false;
        await invalidate("user:joincodes");
        createPromptData.joinCode = res["data"]["joinCode"];
        await alert(
            "Successfully Created Join Code",
            `When ${createPromptData.firstName} creates an account, ask them to use this code on the sign up screen.`,
            `<div class="text-5xl font-bold text-center pt-2">${createPromptData.joinCode}</div>`,
        );
        createPromptData = {
            firstName: "",
            lastName: "",
            role: -1,
            subteam: -1,
            joinCode: null,
        };
    };

    const printRoster = async () => {
        function flattenUsers(usersGrouped: Record<string, UserType[]>): UserType[] {
            return Object.values(usersGrouped).reduce<UserType[]>((acc, group) => acc.concat(group), []);
        }

        switch (type) {
            case 0:
            case 1:
            case 2:
                await RosterExporter.generatePDF(type, sort, flattenUsers(await data.users));
                break;
            case 3:
                await RosterExporter.exportCSV(flattenUsers(await data.users));
                break;
        }
    };

    let members = $state(data.user.permissions.includes(Permission.users_modify) ? 2 : 0);
</script>

{#if data.user.permissions.includes(Permission.users_modify)}
    <Dialog
        bind:open={printRosterOpen}
        title="Download team roster"
        description=""
        actions={[
            { name: "Cancel", action: () => null, close: true },
            { name: "Download", close: true, primary: true, action: printRoster },
        ]}
    >
        <Input
            type="dropdown"
            elements={["Attendance", "Roster", "Squares", "CSV"]}
            name="Format"
            id="format"
            bind:value={type}
        />
        {#if type === 0 || type === 1 || type === 2}
            <Input
                type="dropdown"
                elements={["First Name", "Last Name", "Subteam", "Role"]}
                name="Sort by"
                id="sort"
                bind:value={sort}
            />
        {/if}
    </Dialog>
{/if}

{#snippet blank()}{/snippet}

{#snippet joincodes()}
    <div class="text-subheader pb-2">Active Join Codes</div>
    {#await data.joinCodes.active}
        <Spinner />
    {:then activeJoinCodes}
        <Table
            source={activeJoinCodes}
            emptyStr="No join codes are currently active."
            actions={[
                {
                    name: "Delete",
                    icon: "delete",
                    action: async (selected, reset) => {
                        let value = await confirm(
                            "Delete Join Codes",
                            "Are you sure you want to delete these join codes?",
                            `<div>
                            <b class="text-xl">${selected.map((e) => activeJoinCodes[e].joinCode).join(", ")}</b>
                            <br>
                            <div>These join codes will be invalidated and will not be able to create a new account.</div>
                        </div>`,
                            false,
                        );
                        if (!value) return;
                        const promise = (async () => {
                            let req = await fetch("/api/users/joincodes", {
                                method: "DELETE",
                                body: JSON.stringify(
                                    selected.map(
                                        (e) => activeJoinCodes[e].joinCode,
                                    ),
                                ),
                                headers: { "Content-Type": "application/json" },
                            });
                            if (!req.ok) {
                                await alert(
                                    "Failed to Delete Join Codes",
                                    "The join codes were unable to be deleted and are still active. Please try again later.",
                                );
                                return;
                            }
                            await invalidate("user:joincodes");
                            reset();
                            await alert(
                                "Successfully Deleted Join Codes",
                                `The join codes have been deleted and are no longer valid to create new accounts.`,
                            );
                        })();
                        await wait(
                            promise,
                            "Deleting Join Codes",
                            "Please wait while the join codes are being deleted.",
                        );
                    },
                },
            ]}
        >
            {#snippet header()}
                <th>Join Code</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Created on</th>
            {/snippet}
            {#snippet template({ joinCode, firstName, lastName, createdAt })}
                <th class="px-2">{joinCode}</th>
                <th class="px-2">{firstName}</th>
                <th class="px-2">{lastName}</th>
                <th class="px-2">{formatDate(createdAt)}</th>
            {/snippet}
        </Table>
    {/await}
    <div class="text-subheader py-2">Previously Used Join Codes</div>
    {#await data.joinCodes.used}
        <Spinner />
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
            {#snippet template({ joinCode, firstName, lastName, createdAt })}
                <th class="px-2">{joinCode}</th>
                <th class="px-2">{firstName}</th>
                <th class="px-2">{lastName}</th>
                <th class="px-2">{formatDate(createdAt)}</th>
            {/snippet}
        </Table>
    {/await}
{/snippet}

{#snippet listmembers()}
    {#await data.users}
        <div class="flex flex-row items-middle justify-center w-full space-x-2">
            <Spinner />
            Loading...
        </div>
    {:then users}
        {#if members === 0}
            <div class="text-subheader">
                ADMINISTRATORS
            </div>
            {#if data.user.permissions.includes(Permission.users_modify)}
                <!-- there has to be at least one admin -->
                {#each users.admins as user}
                    <User {user} />
                {/each}
            {:else}
                <div class="bg-slate-700 p-2 my-2">
                    You are not authorised to view administrators. You may contact administrators through the message portal.
                </div>
            {/if}
            <div class="text-gray-200 text-sm font-bold">
                COACHES
            </div>
            {#if users.coaches.length > 0}
                {#each users.coaches as user}
                    <User {user}/>
                {/each}
            {:else}
                <div class="py-1 text-gray-300">No coaches are currently added to the roster.</div>
            {/if}
            <div class="text-gray-200 text-sm font-bold">
                MENTORS
            </div>
            {#if users.mentors.length > 0}
                {#each users.mentors as user}
                    <User {user}/>
                {/each}
            {:else}
                <div class="py-1 text-gray-300">No mentors are currently added to the roster.</div>
            {/if}
            <div class="text-gray-200 text-sm font-bold">
                CAPTAINS
            </div>
            {#if users.captains.length > 0}
                {#each users.captains as user}
                    <User {user}/>
                {/each}
            {:else}
                <div class="py-1 text-gray-300">No captains are currently added to the roster.</div>
            {/if}
            <div class="text-gray-200 text-sm font-bold">
                TEAM LEADS
            </div>
            {#if users.leads.length > 0}
                {#each users.leads as user}
                    <User {user}/>
                {/each}
            {:else}
                <div class="py-1 text-gray-300">No leads are currently added to the roster.</div>
            {/if}
            <div class="text-gray-200 text-sm font-bold">
                TEAM MEMBERS
            </div>
            {#if users.members.length > 0}
                {#each users.members as user}
                    <User {user}/>
                {/each}
            {:else}
                <div class="py-1 text-gray-300">No members are currently added to the roster.</div>
            {/if}
        {:else if members === 1}
            {#await data.usersbydatecreated}
                <div class="flex flex-row items-middle justify-center w-full space-x-2">
                    <Spinner />
                    Loading...
                </div>
            {:then users}
                {#each users as userlist}
                    <div class="text-gray-200 text-sm font-bold">
                        {userlist[0]} year{userlist[0] === 1 ? '' : 's'} ago
                    </div>
                    {#each userlist.slice(1) as user}
                        <User {user}/>
                    {/each}
                {/each}
            {/await}
        {:else if members === 2}
        <Table source={Object.values(users).flat()}>
            {#snippet header()}
                <th>Last Name</th>
                <th>First Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Email</th>
            {/snippet}
            {#snippet template({ firstName, lastName, role, createdAt, email })}
                <th class="px-2">{lastName}</th>
                <th class="px-2">{firstName}</th>
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
                <th class="px-2">{new Date(createdAt).getFullYear()}</th>
                <th class="px-2">{email}</th>
            {/snippet}
        </Table>
        {/if}
    {/await}
{/snippet}

{#snippet listsubteams()}
    <div>
        {#await data.subteamsAvailable}
            <Spinner />
        {:then subteams}
            <div class="space-y-2">
                {#each subteams as { subteam, users }}
                    <SubteamComponent {subteam} {users} />
                {/each}
            </div>
        {/await}
    </div>
{/snippet}

<!-- Dialog box to create a join code -->
<Dialog
    bind:open={createJoinCodeOpen}
    title="Create a join code"
    description="Generate a code to be used for a user to create their account."
    actions={[
        { name: "Cancel", close: true, action: () => null },
        { name: "Create", action: () => createJoinCode(), primary: true },
    ]}
>
    <div class="flex flex-row space-x-2">
        <Input
            name="First Name"
            id="firstname"
            bind:value={createPromptData.firstName}
        />
        <Input
            name="Last Name"
            id="lastname"
            bind:value={createPromptData.lastName}
        />
    </div>
    <div class="flex flex-row pt-2 gap-2">
        <Input
            name="Role"
            id="role"
            type="dropdown"
            elements={["Member", "Team Lead", "Captain", "Mentor", "Coach"]}
            bind:value={createPromptData.role}
        />
        <Input
            name="Subteam"
            id="subteam"
            type="dropdown"
            elements={[...data.subteams.map((v) => v.name)]}
            bind:value={createPromptData.subteam}
        />
    </div>
    {#if createError}
        <div class="text-red-400">
            An error occured while creating a join code: <b>{createError}</b>
        </div>
    {/if}
</Dialog>

<SidebarContent
    items={[
        {
            tabName: "Members",
            tabIcon: "groups",
            nestedItems: [
                {
                    tabName: "Roster",
                    tabIcon: "groups",
                    title: "Team Roster",
                    description: `View all members on ${PUBLIC_TEAM_NAME}.`,
                    content: listmembers,
                    shelf: [
                        {
                            name: ((members) => {
                                switch (members) {
                                    case 0:
                                        return "Group by role";
                                    case 1:
                                        return "Group by date created";
                                    case 2:
                                        return "View as table";
                                }
                            })(members),
                            selections: ((permission) => {
                                if (permission.includes(Permission.users_modify)) {
                                    return ["Role", "Date Created", "Table"];
                                } else {
                                    return ["Role", "Date Created"];
                                }
                            })(data.user.permissions),
                            action: (n) => (members = n),
                        },
                        data.user.permissions.includes(Permission.users_modify) ? {
                            name: "Print",
                            action: () => {
                                printRosterOpen = true;
                            },
                        } : undefined,
                    ],
                },
                data.user.permissions.includes(Permission.users_modify) && {
                    tabName: "New Joins",
                    tabIcon: "link",
                    title: "Join Codes",
                    description: "Allow users to create an account through the use of a join code. Users can only create an account if they have a valid join code. You can set the role that they will have when they create their account.",
                    content: joincodes,
                    shelf: [
                        {
                            name: `Create join code`,
                            action: () => (createJoinCodeOpen = true),
                        },
                    ],
                },
            ],
        },
        {
            tabName: "Subteams",
            tabIcon: "diversity_3",
            title: "All Subteams",
            content: listsubteams,
            shelf: [
            ],
        },
    ]}
    banner={"/banner1.jpg"}
/>
