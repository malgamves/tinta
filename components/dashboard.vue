<script setup lang="ts">
import weaviate, {
    type WeaviateClient,
    ObjectsBatcher,
    ApiKey,
    type WeaviateObject,
} from "weaviate-ts-client";

const runtimeConfig = useRuntimeConfig()

const todo = ref("");
const status = ref("pending");
const showForm = ref(false);
const searchQuery = ref("")
const classProperties = ['description status'];
const searchResults = ref()
const isOpen = ref(false)
const userQuestion = ref("")
const chatContext = ref([
{
    sender: "user",
    message: "how do i start my todolist?"
},
{
    sender: "ai",
    message: "the best way to start is usually with the simplest item"
}]
)

// const todos = ref(["add item to list", "finish project", "add logo", "enable search"]);


const addTodo = async () => {
    const result = await client.data
        .creator()
        .withClassName('Todo')
        .withProperties({
            description: todo.value,
            status: status.value,
        })
        .do()

    todos.value.push(result.properties)
    console.log(result.properties)
    showForm.value = false
    todo.value = ''
}

const sendMessage = async () => {

    chatContext.value.push({
        sender: "user",
        message: userQuestion.value
    })

    const search =  client.graphql
        .get()
        .withClassName('Todo')
        .withFields(classProperties.join(' '))
        .withNearText({
            concepts: ['all items'],
        })
        .withGenerate({
            groupedTask: userQuestion.value,
        });
        // Clear
        userQuestion.value = ''

    
        const searchRes = await search.do()

        // .do();

    // console.log(searchRes.data.Get.Todo)

    chatContext.value.push({
        sender: "ai",
        message: searchRes.data.Get.Todo[0]._additional.generate.groupedResult
    })

    //todo.value = ''
}

const deleteTodo = async (id: WeaviateObject["id"]) => {
    await client.data
        .deleter()
        .withClassName('Todo')  // Class of the object to be deleted
        .withId(id)
        .do();

    todos.value = todos.value.filter(
        (item: WeaviateObject["additional"]) => item._additional.id !== id
    );
}

const completeTodo = async (id: WeaviateObject["id"]) => {
    const result = await client.data
        .merger()  // merges properties into the object
        .withId(id).withClassName('Todo')
        .withProperties({
            status: 'completed',
        })
        .do();

    todos.value = todos.value.filter(
        (item: WeaviateObject["additional"]) => item._additional.id !== id
    );

    // todos.value.push(result.properties)
    // delete original todo, use id to add input from user and update current entry in todos

    console.log('update', result)
    // showForm.value = false
}


const search = async () => {
    const res = await client.graphql
        .get()
        .withClassName('Todo')
        .withFields(classProperties.join(' ') + ' _additional { id vector }')
        .withNearText({ concepts: [`"${searchQuery.value}"`] })
        // .withGenerate({
        //   singlePrompt: "Give me a fun fact about the song {title} by {artist} in one short paragraph",
        // })
        .do();

    // console.log('data', res)
    // console.log('data in todo', res.data.Get.Todo)
    searchResults.value = res.data.Get.Todo
}


const client: WeaviateClient = weaviate.client({
    scheme: "https",
    host: runtimeConfig.public.hostUrl,
    apiKey: new ApiKey(runtimeConfig.public.apiKey),
    headers: {
        "X-OpenAI-Api-Key": runtimeConfig.public.openai,
    },
});

// const classObj = {
//   class: "RSMusic",
//   vectorizer: "text2vec-openai",
//   moduleConfig: {
//     "text2vec-openai": {},
//     "generative-openai": {},
//   },
// };

// const classObject = {
//     "class": "todo",
//     "vectorizer": "text2vec-openai",
//     "moduleConfig": {
//         "text2vec-openai": {},
//         "generative-openai": {}
//     },
//     "properties": [
//         {
//             "name": "description",
//             "dataType": ["text"]
//         },
//         {
//             "name": "status",
//             "dataType": ["text"]
//         },
//     ]
// }

// const res = await client.schema.classCreator().withClass(classObject).do();

const response = await client
    .schema
    .getter()
    .do();
// console.log(response);

const res = await client.graphql.get()
    .withClassName('Todo')
    .withSort([{ path: ['_creationTimeUnix'], order: 'asc' }])
    // Optionally retrieve the vector embedding by adding `vector` to the _additional fields
    .withFields(classProperties.join(' ') + ' _additional { id vector }')
    .do()

const todos = ref(res.data.Get.Todo)

// console.log(res.data.Get.Todo)

</script>

<template>
    <div class="bg-gray-50 h-auto md:h-auto">

        <div class=" flex flex-col items-center justify-start  lg:py-0">
            <a href="#" class="mb-2 mt-24 flex items-center text-2xl font-semibold text-gray-900">
                <h1> acme corp todo list </h1>

            </a>
            <p class="text-sm text-black"> click the clock to mark items done</p>
            <p class="text-sm text-black"> click the bin to archive items</p>


            <form class="space-y-4 md:space-y-6" action="#" @submit.prevent="search()">

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-4">
                    <div class="h-8 rounded-lg  lg:col-span-4">
                        <div>
                            <input id="todoItem" v-model="searchQuery" type="search" name="search"
                                class="focus:ring-primary-600 focus:border-primary-600 block w-full border border-gray-300 bg-gray-50 p-2.5 text-gray-900 sm:text-sm"
                                placeholder="search todos" required="true" />
                        </div>
                    </div>
                    <div class="h-8 rounded-lg">
                        <button type="submit"
                            class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 w-full bg-black px-5 py-2.5 text-center text-sm font-medium text-white focus:outline-none focus:ring-4">
                            search
                        </button>


                    </div>
                </div>


            </form>


        </div>
        <div class="mt-16 flex flex-col h-screen items-center justify-start px-6 py-8 md:h-screen lg:py-0">


            <div class="w-full bg-white shadow sm:max-w-md md:mt-0 xl:p-0">
                <div class="space-y-4 p-6 sm:p-8 md:space-y-6">


                    <div v-if="searchResults">
                        <h1> search res</h1>
                        <div v-for="res in searchResults" class="grid grid-cols-1 gap-2 lg:grid-cols-8 lg:gap-2">
                            <div class="h-8 rounded-lg  lg:col-span-6 text-black"
                                :class="`${res.status == 'completed' ? 'line-through' : ''}`">
                                {{ res.description }}
                            </div>
                            <button v-if="res.status == 'completed'"
                                class="h-8 rounded-lg  flex items-center justify-center">
                                ✅
                            </button>
                            <button @click="completeTodo(res._additional.id)" v-else
                                class="h-8 rounded-lg  flex items-center justify-center">
                                ⏲️
                            </button>
                            <button @click="deleteTodo(res._additional.id)"
                                class="h-8 rounded-lg  flex items-center justify-center">
                                🗑️
                            </button>
                        </div>
                    </div>

                    <div v-else>
                        <h1> normal res</h1>

                        <div v-for="todo in todos" class="grid grid-cols-1 gap-2 lg:grid-cols-8 lg:gap-2">
                            <div class="h-8 rounded-lg  lg:col-span-6 text-black"
                                :class="`${todo.status == 'completed' ? 'line-through' : ''}`">
                                {{ todo.description }}
                            </div>
                            <button v-if="todo.status == 'completed'"
                                class="h-8 rounded-lg  flex items-center justify-center">
                                ✅
                            </button>
                            <button @click="completeTodo(todo._additional.id)" v-else
                                class="h-8 rounded-lg  flex items-center justify-center">
                                ⏲️
                            </button>
                            <button @click="deleteTodo(todo._additional.id)"
                                class="h-8 rounded-lg  flex items-center justify-center">
                                🗑️
                            </button>
                        </div>
                    </div>

                    <button @click="showForm = !showForm"
                        class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 w-full bg-black px-5 py-2.5 text-center text-sm font-medium text-white focus:outline-none focus:ring-4">
                        add new
                    </button>

                    <form v-if="showForm" class="space-y-4 md:space-y-6" action="#" @submit.prevent="addTodo()">

                        <div class="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-4">
                            <div class="h-8 rounded-lg  lg:col-span-4">
                                <div>
                                    <input id="todoItem" v-model="todo" type="todo" name="todo"
                                        class="focus:ring-primary-600 focus:border-primary-600 block w-full border border-gray-300 bg-gray-50 p-2.5 text-gray-900 sm:text-sm"
                                        placeholder="finish demo project" required="true" />
                                </div>
                            </div>
                            <div class="h-8 rounded-lg">
                                <button type="submit"
                                    class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 w-full bg-black px-5 py-2.5 text-center text-sm font-medium text-white focus:outline-none focus:ring-4">
                                    add
                                </button>
                            </div>
                        </div>



                        <!-- <div class="text-l flex items-center font-semibold text-gray-900">
                            <p>
                                error message if any
                            </p>
                        </div> -->
                    </form>
                </div>

                <button type="submit" @click="isOpen = true"
                    class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 w-full bg-black px-5 py-2.5 text-center text-sm font-medium text-white focus:outline-none focus:ring-4">
                    chat
                </button>
            </div>
        </div>

        <USlideover v-model="isOpen">
            <UCard class="flex flex-col flex-1"
                :ui="{ body: { base: 'flex-1 overflow-auto', background: 'bg-slate-200' }, header: { background: 'bg-slate-300' }, footer: { background: 'bg-slate-300' }, ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
                <template #header>
                    <p class="text-black"> chat with your todo list</p>
                </template>


                <div >

                    <div v-for="message in chatContext">
                        <div v-if="message.sender == 'user'" class="flex w-full mt-2 space-x-3 max-w-xs ml-auto justify-end">
                            <div>
                                <div class="bg-primary text-black p-3 rounded-l-lg rounded-br-lg">
                                    <p class="text-sm"> {{ message.message }} </p>
                                </div>
                            </div>
                            <div
                                class="flex-shrink-0 h-10 w-10 rounded-full items-center justify-center flex text-black bg-gray-300">
                                you</div>
                        </div>
                        <div v-if="message.sender == 'ai'" class="flex w-full mt-2 space-x-3 max-w-xs">
                            <div
                                class="flex-shrink-0 h-10 w-10 rounded-full items-center justify-center flex text-black bg-gray-300">
                                ai</div>
                            <div>
                                <div class="bg-gray-300 p-3 rounded-r-lg rounded-bl-lg text-black">
                                    <p class="text-sm"> {{ message.message }} </p>
                                </div>
                            </div>
                        </div>


                    </div>

                </div>

                <template #footer>

                    <div class="relative">
                        <label for="UserEmail" class="sr-only"> Message </label>

                        <input v-model="userQuestion" type="message" id="userMessage" placeholder="type a question"
                            class="w-full rounded-md border-gray-200 p-4 bg-white placeholder:text-black text-black shadow-sm sm:text-sm" />

                        <span class="absolute inset-y-0 end-0 grid w-16 text-gray-500">
                            <button type="submit" @click="sendMessage()"
                                class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 w-16 bg-black px-5 py-2.5 text-start text-sm font-medium text-white focus:outline-none focus:ring-4">
                                send
                            </button>
                        </span>
                    </div>
                </template>
            </UCard>
        </USlideover>
    </div>
</template>


