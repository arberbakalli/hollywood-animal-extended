import { describe, it, expect, jest } from '@jest/globals';
import { EventBus } from '../src/ui/EventBus.js';

describe('EventBus', () => {
    it('calls listener when event is emitted', () => {
        const bus = new EventBus();
        const fn = jest.fn();
        bus.on('test', fn);
        bus.emit('test', { val: 1 });
        expect(fn).toHaveBeenCalledWith({ val: 1 });
    });

    it('on() returns an unsubscribe function', () => {
        const bus = new EventBus();
        const fn = jest.fn();
        const off = bus.on('test', fn);
        off();
        bus.emit('test');
        expect(fn).not.toHaveBeenCalled();
    });

    it('supports multiple listeners for same event', () => {
        const bus = new EventBus();
        const a = jest.fn();
        const b = jest.fn();
        bus.on('x', a);
        bus.on('x', b);
        bus.emit('x');
        expect(a).toHaveBeenCalled();
        expect(b).toHaveBeenCalled();
    });

    it('does not call listeners for other events', () => {
        const bus = new EventBus();
        const fn = jest.fn();
        bus.on('a', fn);
        bus.emit('b');
        expect(fn).not.toHaveBeenCalled();
    });

    it('clear() removes listeners for a specific event', () => {
        const bus = new EventBus();
        const fn = jest.fn();
        bus.on('x', fn);
        bus.clear('x');
        bus.emit('x');
        expect(fn).not.toHaveBeenCalled();
    });

    it('clear() with no args removes all listeners', () => {
        const bus = new EventBus();
        const a = jest.fn();
        const b = jest.fn();
        bus.on('x', a);
        bus.on('y', b);
        bus.clear();
        bus.emit('x');
        bus.emit('y');
        expect(a).not.toHaveBeenCalled();
        expect(b).not.toHaveBeenCalled();
    });
});
