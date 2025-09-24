<script>
    import Button from "$lib/components/Button.svelte";
    import {enhance} from "$app/forms";
    import {onMount} from "svelte";
    import Input from "$lib/components/Input.svelte";
    import Dropdown from "$lib/components/Dropdown.svelte";

    const districts = [
        "FIRST California","FIRST Chesapeake","FIRST in Michigan","FIRST in Texas","FIRST Indiana Robotics","FIRST Mid-Atlantic","FIRST North Carolina","FIRST South Carolina","FIRST Wisconsin","NE FIRST","Peachtree","Pacific Northwest","Ontario","FIRST Israel"
    ];

    let loading = $state(false);
    let { form } = $props();

    let handleEnhance = $state();
    onMount(() => {
        handleEnhance = enhance((opts) => {
            loading = true;

            return async ({ result, update }) => {
                loading = false;
                update(result);
            };
        });
    })
</script>

<form method="POST" class="mx-auto mt-24 w-max dark:bg-green-900 bg-green-200" use:handleEnhance>
    <div class="p-5 text-4xl font-bold dark:bg-green-800 bg-green-300">
        Sign up
    </div>
    <div class="p-5 grid grid-cols-2 gap-5">
        <Input name="First Name" type="text" id="fname"/>
        <Input name="Last Name" type="text" id="lname"/>
        <Input class="col-span-2" name="Username" type="text" id="username"/>
        <Input class="col-span-2" name="Password" type="password" id="password"/>
        <Input name="Email" type="email" id="email"/>
        <Input name="Phone" type="tel" id="phone" pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"/>
        <Input class="col-span-2" name="Address" type="text" id="address"/>
        <Dropdown buttonText="District" items={districts} />
        <div class="text-sm dark:text-red-300 text-red-700 max-w-96">
            {form?.error}
        </div>
    </div>
    <div class="p-5 dark:bg-green-800 bg-green-300">
        <Button type="submit" disabled={loading}>
            {#if loading}Loading...{/if}
            {#if !loading}Sign up{/if}
        </Button>
        <div class="pt-5">
            <div class="text-sm">
                Already have an account? <a href="/account/signin" class="underline">Sign in</a>
            </div>
        </div>
    </div>
</form>