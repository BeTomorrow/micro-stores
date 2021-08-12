import { PaginatedStore } from "../src/stores/paginatedStore";
import { Store } from "../src/stores/store";

describe("A simple paginated Store", () => {
	const bookStore = new PaginatedStore((page) => ({
		page,
		total_pages: 0,
		total_size: 0,
		content: ["Item 1-" + page, "Item 2-" + page],
	}));

	const observedBooks = bookStore.paginatedItems;

	test("Concat new pages to paginated items", async () => {
		expect(observedBooks.get()).toBeNull();
		await bookStore.list();
		expect(observedBooks.get()?.content).toHaveLength(2);
		await bookStore.listMore();
		await bookStore.listMore();
		await bookStore.listMore();
		expect(observedBooks.get()?.content).toHaveLength(8);
		expect(observedBooks.get()?.content[7]).toEqual("Item 2-3");
		await bookStore.list();
		expect(observedBooks.get()?.content).toHaveLength(2);
	});
});

describe("A paginated store binding items stored by ids", () => {
	const bookStore = new Store((id) => ({
		id,
		title: "Fetched",
	}));
	const paginatedStore = new PaginatedStore((page: number) => ({
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
	})).bind(bookStore);

	const observedBookList = paginatedStore.paginatedItems;
	const firstBook = bookStore.getObservable("1-0");
	const secondBook = bookStore.getObservable("2-0");

	test("Last fetched version of book is used in observable", async () => {
		expect(firstBook.get()).toBeNull();
		expect(secondBook.get()).toBeNull();
		await bookStore.fetch("2-0");
		expect(secondBook.get()?.title).toEqual("Fetched");
		await paginatedStore.list();
		expect(firstBook.get()?.title).toEqual("Item 1-0");
		expect(observedBookList.get()?.content[0]?.title).toEqual("Item 1-0");

		expect(secondBook.get()?.title).toEqual("Item 2-0");
		await paginatedStore.listMore();
		expect(secondBook.get()?.title).toEqual("Item 2-0");
		await bookStore.fetch("2-0");

		expect(secondBook.get()?.title).toEqual("Fetched");
		expect(observedBookList.get()?.content[1]?.title).toEqual("Fetched");
		expect(observedBookList.get()?.content).toHaveLength(4);
	});

	test("Removed items from map are not shown in list", async () => {
		expect(observedBookList.get()?.content).toHaveLength(4);
		bookStore.remove("2-0");
		expect(secondBook.get()).toBeNull();
		expect(observedBookList.get()?.content).toHaveLength(3);
		await bookStore.fetch("2-0");
		expect(secondBook.get()?.title).toEqual("Fetched");
		expect(observedBookList.get()?.content).toHaveLength(4);
	});
});

describe("A paginated store presenting items stored by ids", () => {
	const bookStore = new Store((id) => ({
		id,
		title: "Fetched",
		author: "Mr Smith",
	}));
	const paginatedStore = new PaginatedStore((page: number) => ({
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
	})).present(bookStore);

	const observedBookList = paginatedStore.paginatedItems;
	const firstBook = bookStore.getObservable("1-0");
	const secondBook = bookStore.getObservable("2-0");

	// Used in observable list
	// Updated when listing
	// Not added when fetching

	test("Last fetched version of book is used in observable", async () => {
		expect(secondBook.get()).toBeNull();
		await bookStore.fetch("2-0");
		expect(secondBook.get()?.title).toEqual("Fetched");
		expect(secondBook.get()?.author).toEqual("Mr Smith");
		await paginatedStore.list();

		expect(firstBook.get()?.title).toBeUndefined();
		expect(observedBookList.get()?.content[0]?.title).toEqual("Item 1-0");
		expect(secondBook.get()?.title).toEqual("Item 2-0");

		await paginatedStore.listMore();

		expect(secondBook.get()?.title).toEqual("Item 2-0");
		expect(secondBook.get()?.author).toEqual("Mr Smith");

		await bookStore.fetch("2-0");

		expect(secondBook.get()?.title).toEqual("Fetched");
		expect(observedBookList.get()?.content[1]?.title).toEqual("Fetched");
		expect(observedBookList.get()?.content).toHaveLength(4);
	});

	test("Removed items from map are not presented in list", async () => {
		expect(observedBookList.get()?.content).toHaveLength(4);
		bookStore.remove("2-0");
		expect(secondBook.get()).toBeNull();
		expect(observedBookList.get()?.content).toHaveLength(3);
		await bookStore.fetch("2-0");
		expect(secondBook.get()?.title).toEqual("Fetched");
		expect(observedBookList.get()?.content).toHaveLength(4);
	});
});
