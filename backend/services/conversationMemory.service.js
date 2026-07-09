class ConversationMemoryService {

    constructor() {

        this.sessions = new Map();

        this.MAX_HISTORY = 20;

    }

    createSession(sessionId) {

        if (!this.sessions.has(sessionId)) {

            this.sessions.set(sessionId, {

                sessionId,

                createdAt: new Date(),

                updatedAt: new Date(),

                messages: [],

                entities: {

                    currentCustomer: null,

                    currentAppointment: null,

                    currentTreatment: null,

                    currentInvoice: null,

                    currentInventoryItem: null

                }

            });

        }

        return this.sessions.get(sessionId);

    }

    getSession(sessionId = "default") {

        return this.createSession(sessionId);

    }

    addUserMessage(sessionId, message) {

        const session = this.getSession(sessionId);

        session.messages.push({

            role: "user",

            content: message,

            createdAt: new Date()

        });

        session.updatedAt = new Date();

        this.trim(session);

    }

    addAssistantMessage(sessionId, message) {

        const session = this.getSession(sessionId);

        session.messages.push({

            role: "assistant",

            content: message,

            createdAt: new Date()

        });

        session.updatedAt = new Date();

        this.trim(session);

    }

    trim(session) {

        if (session.messages.length <= this.MAX_HISTORY)

            return;

        session.messages = session.messages.slice(-this.MAX_HISTORY);

    }

    updateEntities(sessionId, entities = {}) {

        const session = this.getSession(sessionId);

        session.entities = {

            ...session.entities,

            ...entities

        };

    }

    getEntities(sessionId) {

        return this.getSession(sessionId).entities;

    }

    getHistory(sessionId) {

        return this.getSession(sessionId).messages;

    }

    buildConversationContext(sessionId) {

        const session = this.getSession(sessionId);

        let context = "";

        if (session.entities.currentCustomer) {

            context +=

`Current customer:
${session.entities.currentCustomer.full_name}
Phone: ${session.entities.currentCustomer.phone}

`;

        }

        if (session.entities.currentAppointment) {

            context +=

`Current appointment:
${session.entities.currentAppointment.appointment_time}

`;

        }

        if (session.entities.currentTreatment) {

            context +=

`Current treatment:
${session.entities.currentTreatment.service_name}

`;

        }

        const history = session.messages
            .slice(-6)
            .map(m => `${m.role}: ${m.content}`)
            .join("\n");

        context += history;

        return context;

    }

}

const conversationMemory = new ConversationMemoryService();

export default conversationMemory;