import { UserAction } from './types';

/**
 * Circular Buffer - Fixed-size buffer that overwrites oldest entries
 * 
 * Memory efficient storage for user actions. When the buffer is full,
 * new actions overwrite the oldest ones automatically.
 */
export class CircularBuffer<T = UserAction> {
    private buffer: (T | undefined)[];
    private head: number = 0;
    private tail: number = 0;
    private count: number = 0;
    private readonly maxSize: number;

    constructor(maxSize: number = 50) {
        if (maxSize < 1) {
            throw new Error('Buffer size must be at least 1');
        }
        this.maxSize = maxSize;
        this.buffer = new Array(maxSize);
    }

    /**
     * Add an item to the buffer. If full, overwrites the oldest item.
     */
    add(item: T): void {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.maxSize;

        if (this.count < this.maxSize) {
            this.count++;
        } else {
            // Buffer is full, move tail forward
            this.tail = (this.tail + 1) % this.maxSize;
        }
    }

    /**
     * Get all items in chronological order (oldest to newest)
     */
    getAll(): T[] {
        const result: T[] = [];

        if (this.count === 0) {
            return result;
        }

        let index = this.tail;
        for (let i = 0; i < this.count; i++) {
            const item = this.buffer[index];
            if (item !== undefined) {
                result.push(item);
            }
            index = (index + 1) % this.maxSize;
        }

        return result;
    }

    /**
     * Get the most recent N items
     */
    getLast(n: number): T[] {
        const all = this.getAll();
        return all.slice(-n);
    }

    /**
     * Clear all items from the buffer
     */
    clear(): void {
        this.buffer = new Array(this.maxSize);
        this.head = 0;
        this.tail = 0;
        this.count = 0;
    }

    /**
     * Get the current number of items in the buffer
     */
    size(): number {
        return this.count;
    }

    /**
     * Check if the buffer is empty
     */
    isEmpty(): boolean {
        return this.count === 0;
    }

    /**
     * Check if the buffer is full
     */
    isFull(): boolean {
        return this.count === this.maxSize;
    }

    /**
     * Get the maximum size of the buffer
     */
    capacity(): number {
        return this.maxSize;
    }
}
