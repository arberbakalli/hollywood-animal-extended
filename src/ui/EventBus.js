export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    /** Subscribe to an event. Returns an unsubscribe function. */
    on(event, listener) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(listener);
        return () => this.off(event, listener);
    }

    off(event, listener) {
        const listeners = this._listeners.get(event);
        if (!listeners) return;
        const idx = listeners.indexOf(listener);
        if (idx !== -1) listeners.splice(idx, 1);
    }

    emit(event, payload) {
        const listeners = this._listeners.get(event) ?? [];
        listeners.slice().forEach(fn => fn(payload));
    }

    /** Remove all listeners for an event (or all events). */
    clear(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }
}
