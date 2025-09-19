<script module>
    export const translateRole = role => {
        if (role === Role.administrator) return "Administrator";
        if (role === Role.coach) return "Coach";
        if (role === Role.mentor) return "Mentor";
        if (role === Role.captain) return "Captain"
        if (role === Role.lead) return "Team Lead";
        if (role === Role.member) return "Member";
        throw new Error("Unimplemented role");
    }
</script>

<script>
    /* Information required for the function of this component is the following:
        - firstName
        - lastName
        - avatar
        - role
        - subteam
        - email

    All other information should be protected.
    */
    import {Role} from "$lib/types/types";
    import Button from "$lib/components/Button.svelte";
    import {slide} from "svelte/transition";
    import Dropdown from "$lib/components/Dropdown.svelte";

    let {user} = $props();
</script>
<div class="my-2 bg-gray-800 p-2 flex flex-row gap-2">
    <div class="avatar shrink-0">
        {#if user.avatar}
            <img src="{user.avatar}" alt="avatar" class="w-12 h-12 rounded-full"/>
        {:else}
            <img src="/noprofile.png" alt="avatar" class="w-12 h-12 rounded-full"/>
        {/if}
    </div>
    <div class="flex flex-col">
        <div class="font-bold text-xl">
            {user.firstName} {user.lastName}
        </div>
        <div class="text-sm">
            {translateRole(user.role)} - {user.subteam} - {user.email}
        </div>
    </div>
    <div class="grow"></div>
    <div class=" hover:bg-neutral-500/25 active:bg-neutral-500/50 grid place-items-center transition-colors">
        <Dropdown items={["Contact"]}/>
    </div>
</div>