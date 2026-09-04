declare global {
  interface Map<K, V> {
    getOrInsertComputed(key: K, callbackfn: (key: K) => V): V;
  }

  interface WeakMap<K extends WeakKey, V> {
    getOrInsertComputed(key: K, callbackfn: (key: K) => V): V;
  }
}

type CollectionPrototype<K, V> = {
  getOrInsertComputed?: (key: K, callbackfn: (key: K) => V) => V;
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): unknown;
};

function defineGetOrInsertComputed<K, V>(
  prototype: CollectionPrototype<K, V>,
): void {
  if (typeof prototype.getOrInsertComputed === "function") return;

  Object.defineProperty(prototype, "getOrInsertComputed", {
    configurable: true,
    writable: true,
    value(this: CollectionPrototype<K, V>, key: K, callbackfn: (key: K) => V) {
      if (this.has(key)) return this.get(key) as V;
      const value = callbackfn(key);
      this.set(key, value);
      return value;
    },
  });
}

export function installPdfJsMapCompat(): void {
  defineGetOrInsertComputed(
    Map.prototype as CollectionPrototype<unknown, unknown>,
  );
  defineGetOrInsertComputed(
    WeakMap.prototype as CollectionPrototype<WeakKey, unknown>,
  );
}

installPdfJsMapCompat();
