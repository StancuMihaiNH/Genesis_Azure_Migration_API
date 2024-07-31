import { gql } from "apollo-server";

export const typeDefs = gql`
enum UserRole {
    admin
    user
}
enum MessageRole {
    assistant
    user
}
type User {
    id: ID
    name: String
    email: String
    avatar: String
    avatarUrl: String
    role: UserRole
    phone: String
    createdAt: Int
    updatedAt: Int
}
input UpdateUserInput {
    email:String
    name: String
    phone: String
    avatar: String
    currentPassword: String
    newPassword: String
    role: UserRole
}
type Source {
    id: ID
    filename: String
    content: String
}
input SourceInput {
    id: ID
    filename: String
    content: String
}
type File {
    id: ID
    filename: String
    content: String
    contentType: String
    url: String
}
input FileInput{
    id: ID
    filename: String
    content: String
    contentType: String
}
type Tag {
    id: ID
    displayName: String
    content: String
    categoryId: ID
    category: Category
    attachments: [File]
    userId: ID
    user: User
}
input TagInput {
    id: ID
    categoryId: ID
    displayName: String
    content: String
    attachments: [FileInput]
    userId: ID
}
type Prompt {
    id: ID
    title: String
    description: String
}
type Topic {
    id: ID
    name: String
    aiTitle: String
    description: String
    tags: [Tag]
    createdAt: Int
    updatedAt: Int
    lastMessageAt: Int
    pinned: Boolean
    pinnedAt: Int
}
input CreateTopicInput {
    name: String
    description: String
    tagIds: [ID]
}
input UpdateTopicInput {
    aiTitle: String
    name: String
    description: String
    tagIds: [ID]
}
type Message {
    id: ID
    role: MessageRole
    content: String
    files: [File]
    model: String
    sourceDocuments: [Source]
    localStatusError: Boolean
    createdAt: Int
    updatedAt: Int
}
input CreateMessageInput {
    id: ID
    role: MessageRole
    content: String
    files: [FileInput]
    model: String
    sourceDocuments: [SourceInput]
}
input UpdateMessageInput{
    content: String
    files: [FileInput]
    model: String
    sourceDocuments: [SourceInput]
}
type Viewer {
    user: User
    token: String
}
type MessageConnection {
    items: [Message]
    nextToken: String
}

type PresignedUploadUrlResponse{
    url: String
    key: String
}
type UserConnection {
    items: [User]
    nextToken: String
}
type Category {
    id: ID
    title: String
    description: String
    createdAt: Int
    userId: ID
    user: User
}
type Query {
    viewer: Viewer
    topics(search:String, pinned:Boolean, asc: Boolean ): [Topic]
    topic(id: ID): Topic
    messages(topicId: ID, nextToken: String): MessageConnection
    tags: [Tag]
    prompts: [Prompt]
    users(nextToken: String): UserConnection
    getFileContent(key: String): String
    categories: [Category]
}

type Mutation {
    addCategory(title: String, description:String): Category
    editCategory(id: ID, title: String, description:String, userId: ID): Category
    deleteCategory(id: ID): Boolean
    createTopic(input: CreateTopicInput): Topic
    updateTopic(id: ID, input: UpdateTopicInput): Topic
    pinTopic(id: ID): Topic
    unpinTopic(id: ID): Topic
    deleteTopic(id: ID): Boolean
    createMessage(topicId: ID, input: CreateMessageInput): Message
    updateMessage(topicId: ID, messageId: ID, input: UpdateMessageInput): Message
    updateUser(id: ID, input: UpdateUserInput): User
    createUser(name: String, email: String, password: String): User
    deleteUser(id: ID): Boolean
    register(name: String,email: String, password: String): Viewer
    login(email: String, password: String): Viewer
    updateMyAccount(input: UpdateUserInput): Viewer
    presignedUploadUrl(filename: String, contentType: String, prefix: String): PresignedUploadUrlResponse
    createTag(input: TagInput): Tag
    updateTag(input: TagInput): Tag
    deleteTag(id: ID): Boolean
    createPrompt(title: String, description: String): Prompt
    deletePrompt(id: ID): Boolean
}
`;