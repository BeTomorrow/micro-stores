import { createStore } from "../src/store";

describe("A simple store referencing items by ids", () => {
	const bookStore = createStore({
		fetch: (id: string) => ({
			id,
			title: "Fetched",
		}),
	});

	const observedBook = bookStore.getObservable("tested");

	test("Updates the observed item when fetching, saving or deleting", () => {
		bookStore.fetch("other");
		expect(observedBook.get()).toBeUndefined();
		bookStore.fetch("tested");
		expect(observedBook.get()).toEqual({ id: "tested", title: "Fetched" });
		bookStore.save({ id: "tested", title: "Updated" });
		expect(observedBook.get()).toEqual({ id: "tested", title: "Updated" });
		bookStore.remove("tested");
		expect(observedBook.get()).toBeUndefined();
	});
});

describe("A simple paginated Store", () => {
	const bookStore = createStore({
		list: (page: number) => ({
			page,
			total_pages: 0,
			total_size: 0,
			content: ["Item 1-" + page, "Item 2-" + page],
		}),
	});

	const observedBooks = bookStore.paginatedItems;

	test("Concat new pages to paginated items", () => {
		expect(observedBooks.get()).toBeNull();
		bookStore.list();
		expect(observedBooks.get()?.content).toHaveLength(2);
		bookStore.listMore();
		bookStore.listMore();
		bookStore.listMore();
		expect(observedBooks.get()?.content).toHaveLength(8);
		expect(observedBooks.get()?.content[7]).toEqual("Item 2-3");
		bookStore.list();
		expect(observedBooks.get()?.content).toHaveLength(2);
	});
});

describe("A paginated store presenting items stored by ids", () => {
	const bookStore = createStore({
		fetch: (id: string) => ({
			id,
			title: "Hello",
		}),
		list: (page: number) => ({
			page,
			total_pages: 0,
			total_size: 0,
			content: [
				{
					id: "1-" + page,
					title: "Item 1-" + page,
				},
				{
					id: "2-" + page,
					title: "Item 2-" + page,
				},
			],
		}),
	});

	const observedBookList = bookStore.paginatedItems;
	const secondBook = bookStore.getObservable("2-0");

	test("Last fetched version of book is used in observable", () => {
		expect(secondBook.get()).toBeUndefined();
		bookStore.fetch("2-0");
		expect(secondBook.get()?.title).toEqual("Hello");
		bookStore.list();

		expect(secondBook.get()?.title).toEqual("Item 2-0");
		bookStore.listMore();
		expect(secondBook.get()?.title).toEqual("Item 2-0");
		bookStore.fetch("2-0");
		expect(secondBook.get()?.title).toEqual("Hello");
		expect(observedBookList.get()?.content).toHaveLength(4);
	});

	test("Removed items from map are not presented in list", () => {
		expect(observedBookList.get()?.content).toHaveLength(4);
		bookStore.remove("2-0");
		expect(secondBook.get()).toBeUndefined();
		expect(observedBookList.get()?.content).toHaveLength(3);
		bookStore.fetch("2-0");
		expect(secondBook.get()?.title).toEqual("Hello");
		expect(observedBookList.get()?.content).toHaveLength(4);
	});
});
