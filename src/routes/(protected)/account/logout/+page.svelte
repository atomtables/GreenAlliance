<script lang="ts">
    import {onMount} from "svelte";

    onMount(() => {
        document.forms['logout'].submit();
    })
</script>

<form method="POST" name="logout">

</form>