# Micro-stores

_A light state management library featuring observables and immutability_

## Usage

```ts
import { Store } from "micro-stores";

const bookStore = new Store((id) => fetch(`https://myApi.com/books/${id}`));
const myFavoriteBook = bookStore.getObservable("dracula");

console.log(myFavoriteBook.get()); // null
bookStore.fetch("dracula");
console.log(myFavoriteBook.get()); // { id: "Dracula", ... }
```

# ⚠️ Usage with React Native ⚠️

This library depends on [**uuid**](https://github.com/uuidjs/uuid). To use _uuid_, and therefore _micro-stores_ with React Native, you need to follow the steps described at https://github.com/uuidjs/uuid#react-native--expo:

- Install react-native-get-random-values
- Run a `pod install`
- Import it at the root of your app:  
  `import 'react-native-get-random-values';`

## Micro-observables

This library is quite heavily based on [**micro-observables**](https://github.com/BeTomorrow/micro-observables). You may want to take a look at the `Observable` signature there.

## Api

Micro-stores exposes 3 main Stores that can be used to easily manage your application state.

### Store

A simple _Store_ retrieving items using a primary key.

```ts
import { Store } from "micro-stores";

const bookStore = new Store((id) => fetchBook(id));
bookStore.fetch();
```

To create a _Store_, you have to provide a fetcher function retrieving objects using an unique identifier. By default, your store will use the `id` property of the object (if it exists).  
If your object doesn't have an `id` property, you will need to use one, or specify another unique property to be used.

**Constructor parameters**

| Parameter  | Type                                        | Default Value | Description                                |
| ---------- | ------------------------------------------- | ------------- | ------------------------------------------ |
| fetch      | (key: string, ...args) => T \| Promise\<T\> | /             | The function retrieving item by its key    |
| primaryKey | string                                      | "id"          | The primary key to use to map your objects |

**Builder Methods**

**bindProperty**

You can enrich your _Store_ by binding a property to another _Store_ using the `bindProperty` method.  
This is useful if you want to ensure yours objects are up to date when making changes to its referenced property. The _Store_ will use the referenced property unless it is removed from its own _Store_

**Usage**

```ts
import { Store } from "micro-stores";

const userStore = new Store(fetchUser);
const bookStore = new Store(fetchBook).bindProperty("infos.author", userStore);

bookStore.fetch("dracula");
console.log(userStore.getObservable("bram-staker").get());
// { id: bram-stoker, name: "Bram Stoker" }
userStore.save({ id: "bram-staker", name: "Bram" });
console.log(bookStore.getObservable("dracula").get().infos.author);
// { id: "bram-staker", name: "Bram" }
userStore.remove("bram-staker");
console.log(bookStore.getObservable("dracula").get().infos.author);
// { id: "bram-staker", name: "Bram Staker" }
```

| Method       | Type                                                     | Description                               |
| ------------ | -------------------------------------------------------- | ----------------------------------------- |
| bindProperty | (path: string, referenceStore: Store\<U\>) => Store\<T\> | Binds your item property to another Store |

**Methods and properties**

Main methods and properties:

| Property              | Type                                              | Description                                                                        |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| primaryKey            | string                                            | The primary key to use to map your objects                                         |
| items                 | Observable\<Map\<string, T\>\>                    | The observable of the items mapped by their key                                    |
| getObservable         | (key: string) => Observable\<T\>                  | Retrieve an observable using its key                                               |
| fetch                 | (key: string, ...args: Args) => void              | Call the Store `fetch` function and saves the received item                        |
| save                  | (item: T) => void                                 | Save an item to the Store. If an items exists will the same key, it will be erased |
| merge                 | (items: T[]) => void                              | Save several items at once                                                         |
| remove                | (key: string) => void                             | Remove an item from the Store                                                      |
| update                | (key: string, updater: (current: T) => T) => void | Update an item using an update callback, if it exists                              |
| updateProperties      | (item: Partial<T>) => void                        | Update an items with specified properties, if it exists                            |
| batchUpdateProperties | (items: Partial<T>[]) => void                     | Update several items with specific properties, if they exists                      |
| onDelete              | Signal<string>                                    | Called when an item is removed from the Store                                      |

### PaginatedStore

A _PaginatedStore_ stores items in an Array and handles pagination for you using _Pages_.

```ts
import { PaginatedStore } from "micro-stores";

const bookStore = new PaginatedStore((page) => fetchBooks(page));
bookStore.list();
bookStore.listMore();
bookStore.listMore();
```

To create a _PaginatedStore_, you have to provide a fetcher function retrieving a page of objects using an page number.

A Page is an interface defined by this properties:

```ts
interface Page {
	content: T[];
	page: number;
	totalPages: number;
	totalSize: number;
}
```

**Constructor parameters**

| Parameter | Type                                                          | Description                               |
| --------- | ------------------------------------------------------------- | ----------------------------------------- |
| fetchList | (page: number, ...args: Args) => Promise<Page<T>> \| Page<T>) | The function retrieving Page by its index |

**Builder Methods**

**bind**

You can bind your _PaginatedStore_ to another _Store_ using the `bind` method.  
This will allow you to show in your list of items the actual items from the binded _Store_, thus ensuring them to be up to date. The binded _Store_ will also be automatically updated with the values retrieved when listing objects from the _PaginatedStore_
You can only bind a _PaginatedStore_ to a _Store_ that stores the exact same interface of objects. Meaning that your _PaginatedStore_ will have to use the same unique identifier property as your simple _Store_.  
You can only bind your _PaginatedStore_ to a single _Store_.

**Usage**

```ts
import { Store, PaginatedStore } from "micro-stores";

const bookStore = new Store(fetchBook);
const favoriteBookStore = new PaginatedStore(fetchBook).bind(bookStore);

favoriteBookStore.list();
console.log(bookStore.getObservable("dracula").get());
// { id: "dracula", name: "Dracula" }
bookStore.save({ id: "dracula", name: "Dracula 2" });
console.log(favoriteBookStore.paginatedItems.get().content[0]);
// { id: "dracula", name: "Dracula 2" }
bookStore.remove("dracula");
console.log(favoriteBookStore.paginatedItems.get().content[0]);
// null
```

**present**

`present` is very similar to the `bind` building method. The difference being it allows you to present from a _Store_ items that are partials objects stored in a _PaginatedStore_.  
For performance purpose, prefer using `bind` over `present` if your _Store_ and your _PaginatedStore_ use the exact same objects.

Your can only `bind` or `present` one single _Store_

| Method  | Type                                                 | Description                                 |
| ------- | ---------------------------------------------------- | ------------------------------------------- |
| bind    | (referenceStore: Store\<T\>) => Store\<T\>           | Binds your Paginated Store to another Store |
| present | (referenceStore: Store\<U extends T\>) => Store\<T\> | Binds your Paginated Store to another Store |

**Methods and properties**

Main methods and properties:

| Property       | Type                            | Description                                                                          |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| fetching       | Observable\<boolean\>           | Is the store fetching initial items ?                                                |
| fetchingMore   | Observable\<boolean\>           | Is the store fetching more items ?                                                   |
| paginatedItems | Observable\<Page\<T\> \| null\> | The observable page of the items                                                     |
| list           | (...args: Args) => void         | Call the Store `fetchList` function for the first page and erases the existing items |
| listMore       | (...args: Args) => void         | Call the Store `fetchList` function and merge the new items                          |

### MappedStore

A _MappedStore_ stores paginated arrays of items in an Map.  
It is quite similar to _PaginatedStore_, also allowing you to store your paginated items according to specified keys.

```ts
import { MappedStore } from "micro-stores";

const bookStore = new MappedStore((userId, page) => fetchFavoriteBooksForUser(userId, page));
bookStore.list("user-1");
bookStore.listMore("user-1");
bookStore.list("user-2");
```

To create a _MappedStore_, you have to provide a fetcher function retrieving a page of objects using a mapping key and page number.

**Constructor parameters**

| Parameter | Type                                                                      | Description                               |
| --------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| fetchList | (id: string, page: number, ...args: Args) => Promise<Page<T>> \| Page<T>) | The function retrieving Page by its index |

**Builder Methods**

**bind** and **present**

Just like a _PaginatedStore_, a _MappedStore_ allows you to bind/present another _Store_.

**Methods and properties**

Main methods and properties:

| Property           | Type                                            | Description                                                                                       |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| getFetching        | (key:string) => Observable\<boolean\>           | Is the store fetching initial items for this key?                                                 |
| getFetchingMore    | (key:string) => Observable\<boolean\>           | Is the store fetching more items for this key?                                                    |
| getObservableItems | (key:string) => Observable\<Page\<T\> \| null\> | The observable page of the items                                                                  |
| list               | (key: string, ...args: Args) => void            | Call the Store `fetchList` function for this key for the first page and erases the existing items |
| listMore           | (key: string, ...args: Args) => void            | Call the Store `fetchList` function for this key and merge the new items                          |

## Usage with React

This library makes State Management easier for any nodeJS or browser application, and has been especially thought to be used with React.  
This is why Micro-stores also gives you hooks to help you manage and retrieve the state of your React project:

### useStore(key: string, store, deps)

Return the value of the matching the given key, the loading state and the current error. Triggers a re-render when the value changes.

```tsx
import { Store, useStore } from "micro-stores";

const bookStore = new Store(fetchBook);

const DraculaBookView = () => {
	const { result: book, loading, error } = useStore("dracula", bookStore);

	if (book) {
		return (
			<div>
				{book.title} from {book.author}
			</div>
		);
	}
	if (loading) {
		return <div>Loading...</div>;
	}
	return null;
};
```

### usePaginatedStore(paginatedStore, deps, ...args)

Returns a `PaginatedDataResult` of the given paginated store. Triggers a rerender when these properties change.

```tsx
import { PaginatedStore, usePaginatedStore } from "micro-stores";

const bookStore = new PaginatedStore(fetchBooks);

const BookView = () => {
	const { result: books, listMore, lastPage, loading, moreLoading } = usePaginatedStore(bookStore);

	if (loading) {
		return <div>Loading...</div>;
	}
	return <div>
		<h2>Books</h2>
		{books.map(book => <BookView book={book}/>}
		{moreLoading && <div>Loading...</div>}
		{!lastPage && <button onClick={() => listMore()}>Load More</button>}
	</div>
};
```

### useMappedStore(key, mappedStore, deps, ...args)

Similar to `usePaginatedStore`, only difference being you need to pass in the key you want to fetch.

**PaginatedDataResult**

The PaginatedDataResult is defined like this:

| Property    | Type                    | Description                      |
| ----------- | ----------------------- | -------------------------------- |
| result      | T[]                     | The current array of results     |
| loading     | boolean                 | Is the first page being loaded   |
| moreLoading | boolean                 | Are more items beeing loaded     |
| error       | Error \|null            | Fetching error                   |
| lastPage    | boolean                 | Are all the pages fetched        |
| totalPages? | number \| undefined     | The number of pages              |
| totalSize?  | number \| undefined     | The total size of the elements   |
| list        | (...args: Args) => void | Function to fetch the first page |
| listMore    | (...args: Args) => void | Function to fetch the next page  |

### **⚠️ These hooks allow you to add some custom arguments to your fetch functions.**

These arguments are treated as dependencies in the nested hooks, causing re-render or refetch when they change.  
**This means that if you want to use custom arguments in your fetch functions, you should only use primitives, or wrap your Objects or Array arguments in useMemo() hooks**

## Typescript

This library is entirely written in Typescript, meaning you can benefit from its typings without installing other packages.
