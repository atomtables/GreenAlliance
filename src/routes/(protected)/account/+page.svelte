<script>
    import Button from "$lib/components/Button.svelte";
    import {goto} from "$app/navigation";
</script>

<Button onclick={() => {goto("/account/logout")}}>sign out</Button>