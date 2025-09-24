<script>
    import Spinner from "$lib/components/Spinner.svelte";
    import {Permission} from "$lib/types/types";
    import User from "$lib/components/User.svelte";
    import SidebarContent from "$lib/substructure/SidebarContent.svelte";
    import SubteamComponent from "./SubteamComponent.svelte";
    import banner1 from "./banner1.jpg";
    import {goto} from "$app/navigation";
    import jsPDF from "jspdf";

    let { data } = $props();

    let members = $state(0);

    async function generatePDF(n) {

            const doc = new jsPDF("p", "mm", "a4");
            let yPosition = 20;
            const leftMargin = 15;

            // Title
            doc.setFontSize(18);
            doc.text("Team Members", leftMargin, yPosition);
            yPosition += 10;
        if (n === 0) {
            const users = await data.users;

            // Body
            const positions = Object.keys(users);
            Object.values(users).forEach((pos, i) => {
                doc.setFontSize(14);
                if (i !== 0) yPosition += 7;
                doc.text(positions[i], leftMargin, yPosition);
                yPosition += 7;
                doc.setFontSize(11);
                pos.forEach(user => {
                    doc.text(user.firstName, leftMargin, yPosition);
                    yPosition += 5;
                })
            })
        } else if (n === 1) {
            const users = await data.subteams;

            // Body
            users.forEach((subteam, i) => {
                doc.setFontSize(14);
                if (i !== 0) yPosition += 7;
                doc.text(subteam["subteam"], leftMargin, yPosition);
                yPosition += 7;
                doc.setFontSize(11);
                subteam["users"].forEach(user => {
                    doc.text(user.firstName, leftMargin, yPosition);
                    yPosition += 5;
                })
            })
        }

        doc.save("roster.pdf");
    }
</script>

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
        {/if}
    {/await}
{/snippet}
{#snippet listsubteams()}
    <div>
        {#await data.subteams}
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

<SidebarContent
    items={[
        {
            tabName: "Members",
            tabIcon: "group",
            title: "All Members",
            content: listmembers,
            shelf: [
                {
                    name: `Group by ${members === 0 ? 'role' : 'date created'}`,
                    selections: ["Role", "Date Created"],
                    action: n => members = n
                }, {
                    name: "Download by Position",
                    action: () => {generatePDF(0)}
                }, data.user.permissions.includes(Permission.users_modify) && {
                    name: "Modify Members",
                    action: () => goto("/users/modify")
                }
            ].filter(val => typeof val !== "boolean")
        },
        {
            tabName: "Subteams",
            tabIcon: "diversity_3",
            title: "All Subteams",
            content: listsubteams,
            shelf: [
                {
                    name: "Download by Subteam",
                    action: () => {generatePDF(1)}
                }, data.user.permissions.includes(Permission.users_modify) && { name: "Modify Subteams", action: () => goto("/users/modify") }
            ].filter(val => typeof val !== "boolean")
        }
    ]}
    banner={banner1}
/>
