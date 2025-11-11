<script lang="ts">
    import Button from "$lib/components/Button.svelte";
    import {enhance} from "$app/forms";
    import {onMount} from "svelte";
    import Input from "$lib/components/Input.svelte";
    import Dropdown from "$lib/components/Dropdown.svelte";
    import { goto, invalidateAll } from "$app/navigation";

    let loading = $state(false);
    let { form } = $props();

    type InputValue = string | FormDataEntryValue;

    let action = $state("?/verify")
    let nextStage = $state(false)
    let firstName: InputValue = $state("")
    let lastName: InputValue = $state("")
    let joinCode: InputValue = $state("")
</script>

<form {action} method="POST" class="mt-10 mx-auto w-max max-w-120 dark:bg-green-900 bg-green-200" use:enhance={(opts: any) => {
            loading = true;
            if (nextStage) {
                opts.formData.set("fname", String(firstName ?? ""))
                opts.formData.set("lname", String(lastName ?? ""))
                opts.formData.set("jcode", String(joinCode ?? ""))
            } else {
                firstName = String(opts.formData.get("fname") ?? "")
                lastName = String(opts.formData.get("lname") ?? "")
                joinCode = String(opts.formData.get("jcode") ?? "")
            }

            return async ({ result, update }: any) => {
                loading = false;
                if (result?.type === 'success') {
                    action = "?/create"
                    if (nextStage) invalidateAll().then(() => window.open("/", "_self"));
                    nextStage = true
                    update?.(result)
                } else update?.(result);
            };
        }}>
    <div class="p-5 text-4xl font-bold dark:bg-green-800 bg-green-300">
        Sign up
    </div>
    <div class="p-5 flex flex-col gap-2">
        {#if !nextStage}
            <div class="flex flex-row gap-2">
                <Input name="First Name" type="text" id="fname" required autocomplete="firstname"/>
                <Input name="Last Name" type="text" id="lname" required autocomplete="lastname"/>
            </div>
            <Input name="Your join code" type="text" id="jcode" required/>
            <div class="text-sm text-neutral-300">
                By creating an account on this team's Green Alliance page, you agree to all the terms and conditions
                of the team, of The Green Alliance platform, and of any that may apply in your jurisdiction.
            </div>
        {:else}
            <div class="text-2xl font-light">
                Hey, <b>{firstName}</b>! Welcome to team 11104!
            </div>
            <Input name="Username" type="text" id="username" required autocomplete="username"/>
            <Input name="Password" type="password" id="password" required autocomplete="newpassword"/>
            <Input name="Confirmation" type="password" id="confirmation" required autocomplete="new-password"/>
            <hr>
            <div class="flex flex-row gap-2">
                <Input name="Age" type="number" id="age" required pattern="[0-9]{'{2}'}" class="flex-1/5" />
                <Input name="Phone number" type="text" id="pnumber" />
            </div>
            <Input name="Email" type="email" id="email" required />
            <hr>
            <div class="flex flex-row gap-2">
                <Input name="House#" type="number" id="addnum" class="flex-1/3" />
                <Input name="Address line 1" type="text" id="addline1" />
            </div>
            <div class="flex flex-row gap-2">
                <Input name="Address line 2" type="text" id="addline2" />
            </div>
            <div class="flex flex-row gap-2">
                <Input name="City" type="text" id="addcity" class="flex-1/3" />
                <Input name="State" type="text" id="addstate" class="flex-1/3" />
                <Input name="Zip code" type="text" id="addzip" class="flex-1/4"/>
            </div>
        {/if}
        {#if form?.error}
            <div class="text-sm dark:text-red-300 text-red-700 max-w-96">
                {form?.error}
            </div>
        {/if}
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