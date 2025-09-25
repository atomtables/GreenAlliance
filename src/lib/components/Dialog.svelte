<script module lang="ts">
    import {createRawSnippet, mount, unmount, type Snippet} from "svelte";
    import Dialog from "./Dialog.svelte"
    import Input from "$lib/components/Input.svelte";

    async function never(promise: Promise<any>) {
        let run = true;
        while (run) {
            promise.then(() => run = false);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    export const alert = async (title: string, description: string = "", children = null, manualclose = false) => {
        let state;
        const result = new Promise(resolve => state = resolve);
        let close;
        const manual = new Promise(resolve => close = resolve);

        let element = document.createElement("div");
        document.body.appendChild(element);

        let props = $state({
            open: false,
            title,
            description,
            loading: false,
            actions: [{
                name: "OK",
                action: async () => {
                    await state(true);
                    if (manualclose) await never(manual);
                },
                primary: true
            }],
            children: createRawSnippet(() => ({
                render: () => children ?? "<div></div>"
            }))
        })

        const dialog = mount(Dialog, {
            target: element,
            props
        })

        props.open = true

        let value = [await result];
        if (manualclose) {
            manual.then(() => {
                props.open = false;
                setTimeout(async () => {
                    await unmount(dialog);
                    element.remove();
                }, 400)
            })
        } else {
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
        }
        return value;
    }

    export const confirm = async (title, description, children: string | Snippet = "", isSnippet = false, manualclose = false): Promise<[boolean, null | Function]> => {
        let state;
        const result: Promise<boolean> = new Promise(resolve => state = resolve);
        let close;
        const manual = new Promise(resolve => close = resolve);

        let element = document.createElement("div");
        document.body.appendChild(element);

        let props = $state({
            open: false,
            title,
            description,
            loading: false,
            actions: [{
                name: "Cancel",
                action: async () => {
                    state(false)
                    if (manualclose) await never(manual);
                },
                close: true
            }, {
                name: "Yes",
                action: async () => {
                    state(true)
                    if (manualclose) await never(manual);
                },
                primary: true,
                close: true
            }],
            children: isSnippet ? children as Snippet : createRawSnippet(() => ({
                render: () => children.toString() ?? "<div></div>"
            }))
        })

        const dialog = mount(Dialog, {
            target: element,
            props
        })

        props.open = true

        let value: [boolean, Function | null] = [await result, null];
        if (manualclose) {
            manual.then(() => {
                props.open = false;
                setTimeout(async () => {
                    await unmount(dialog);
                    element.remove();
                }, 400)
            })
            value[1] = close
        } else {
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
        }
        return value;
    }

    export const wait = async (promise: any, title: string, description = "", children = null, showFail = false) => {
        let state: any;
        const result = new Promise(resolve => state = resolve);
        let close: any;
        const manual = new Promise(resolve => close = resolve);

        let element = document.createElement("div");
        document.body.appendChild(element);

        let props = $state({
            open: false,
            title,
            description,
            loading: true,
            actions: [promise?.cancel && {
                name: "Cancel",
                action: async () => {
                    promise.cancel()
                    state(false)
                    if (manual) await never(manual);
                },
                close: true
            }].filter(n => n),
            children: createRawSnippet(() => ({
                render: () => children ?? "<div></div>"
            }))
        })

        const dialog = mount(Dialog, {
            target: element,
            props
        })

        props.open = true

        promise.then(() => {
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
        })

        promise.catch(() => {
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
            alert("Error", "An error occured while waiting.");
        })

        promise.finally(() => state(true));

        return [await result, close];
    }

    export const prompt = async (title, description, input, children, isSnippet, manualclose) => {
        let state;
        const result = new Promise(resolve => state = resolve);
        let close;
        const manual = new Promise(resolve => close = resolve);

        let element = document.createElement("div");
        document.body.appendChild(element);

        let inputProps = $state({
            name: input,
            value: "",
            action: null,
            elements: null
        })
        let props = $state({
            open: false,
            title,
            description,
            loading: false,
            actions: [{
                name: "Cancel",
                action: async () => {
                    state(null)
                    if (manualclose) await never(manual);
                },
                close: true
            }, {
                name: "OK",
                action: async () => {
                    state(inputProps.value)
                    if (manualclose) await never(manual);
                },
                primary: true,
                close: true
            }],
            children: isSnippet ? children : createRawSnippet(() => ({
                render: () => "<div class='w-full h-full'></div>",
                setup: (target) => {
                    const comp = mount(Input, {
                        target,
                        props: inputProps,
                    })
                    return () => {
                        unmount(comp);
                    }
                }
            }))
        })

        const dialog = mount(Dialog, {
            target: element,
            props
        })

        props.open = true

        let value = [await result];
        if (manualclose) {
            manual.then(() => {
                props.open = false;
                setTimeout(async () => {
                    await unmount(dialog);
                    element.remove();
                }, 400)
            })
            value = [value, close]
        } else {
            props.open = false;
            setTimeout(async () => {
                await unmount(dialog);
                element.remove();
            }, 400)
        }
        return value;
    }
</script>

<script lang="ts">
    import Button from "$lib/components/Button.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import {fade} from "svelte/transition";
    import {quadInOut} from "svelte/easing";
    import type { AsyncFunction } from "$lib/prototypes/prototypes";


    let {open = $bindable(), title, description = "", actions = [], children = null, loading = false}: {
        open: boolean,
        title: string,
        description?: string,
        actions: {
            name: string,
            action: AsyncFunction | Function,
            primary?: boolean,
            close?: boolean
        }[],
        children?: Snippet,
        loading?: boolean
    } = $props();
    const closeF = () => open = false;
</script>

{#if open}
    <div class="fixed inset-0 z-50000 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm text-white"
         transition:fade={{ delay: 50, duration: 150, easing: quadInOut }}>
        <div
                class="bg-neutral-800 shadow-xl w-full min-w-md max-w-2xl mx-4"
                role="dialog"
                aria-modal="true"
                transition:fade={{ duration: 150, easing: quadInOut }}
        >
            <div class="px-6 pt-5">
                <h2 class="text-2xl font-bold flex flex-row items-center gap-2">
                    {#if loading}
                        <Spinner class="p-1" />
                    {/if}
                    <span>{title}</span>
                </h2>
                <h5 class="pt-0 font-semibold max-w-full text-ellipsis overflow-none">{@html description}</h5>
            </div>

            <div class="px-6 py-2">
                {@render children?.()}
            </div>

            {#if actions}
                <div class="px-6 pb-4 pt-4 flex justify-end gap-2">
                    {#each actions as {name, action, primary, close}}
                        <Button transparent={!primary}
                                onclick={!close ? action?.() : async () => { await action?.(); closeF(); }}>
                            {name}
                        </Button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>