<script lang="ts">
    import { Role } from "$lib/types/types";
    import { onMount } from "svelte";
    import { alert } from "$lib/components/Dialog.svelte";
    
    let {data} = $props();

    onMount(() => {
        if (data.user.role === Role.administrator) {
            alert("Warning", "You are currently logged in as an administrator. Administrators have all permissions, regardless of whatever is set in the database. For this reason, please exercise caution while logged into this account. Do not use this account for anything other than configuration. If you require an account, please make one with the appropriate permissions.")
        }
    })
</script>

<div>

</div>