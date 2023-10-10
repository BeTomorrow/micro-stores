import { Store } from "../src/stores/store";

describe("A simple store referencing items by ids", () => {
	const bookStore = new Store((id) => ({
		id,
		title: "Fetched",
	}));

	const observedBook = bookStore.getObservable("tested");

	test("Updates the observed item when fetching, saving, deleting or clearing", async () => {
		await bookStore.fetch("other");
		expect(observedBook.get()).toBeNull();
		await bookStore.fetch("tested");

		expect(observedBook.get()).toEqual({ id: "tested", title: "Fetched" });
		bookStore.save({ id: "tested", title: "Updated" });
		expect(observedBook.get()).toEqual({ id: "tested", title: "Updated" });
		bookStore.remove("tested");
		expect(observedBook.get()).toBeNull();
		bookStore.merge([{ id: "tested", title: "From Merge" }]);
		expect(observedBook.get()).toEqual({ id: "tested", title: "From Merge" });
		bookStore.clear();
		expect(observedBook.get()).toBeNull();
	});
});

describe("A store using references to another", () => {
	const authorStore = new Store(getAuthor, "_id");

	const bramStroker = authorStore.getObservable("bram-stoker");

	const bookStore = new Store(getBook).bindProperty("infos.author", authorStore);
	const dracula = bookStore.getObservable("dracula");

	it("Update the referenced store when fetching object", async () => {
		expect(bramStroker.get()).toBeNull();
		await bookStore.fetch("dracula");
		expect(bramStroker.get()?._id).toEqual("bram-stoker");
	});

	it("Uses the referenced store when retrieving object", async () => {
		await bookStore.fetch("dracula");
		expect(dracula.get()?.infos.author.name).toEqual("Bram Stoker");
		await authorStore.fetch("bram-stoker");
		expect(bramStroker.get()?.name).toEqual("Bram Stoker Original");
		expect(dracula.get()?.infos.author.name).toEqual("Bram Stoker Original");
		authorStore.update("bram-stoker", (current) => ({ ...current, name: "Edited" }));
		expect(dracula.get()?.infos.author.name).toEqual("Edited");
	});

	it("Fallbacks on its own value if not reference found", async () => {
		authorStore.clear();
		expect(bramStroker.get()).toBeNull();
		expect(dracula.get()?.infos.author.name).toEqual("Bram Stoker");
	});

	it("Fallbacks on null if reference has been purposely deleted", async () => {
		await authorStore.fetch("bram-stoker");
		expect(bramStroker.get()?.name).toEqual("Bram Stoker Original");
		expect(dracula.get()?.infos.author.name).toEqual("Bram Stoker Original");
		authorStore.remove("bram-stoker");
		expect(bramStroker.get()).toBeNull();
		expect(dracula.get()?.infos.author).toBeNull();
	});
});

describe("A store referencing itself", () => {
	const userStore = new Store<User>(() => ({ id: "", name: "" }));
	userStore.bindProperty("father", userStore);

	userStore.save({
		id: "one",
		name: "One",
	});
	userStore.save({
		id: "two",
		name: "Two",
		father: {
			id: "one",
			name: "Father One",
		},
	});
});

describe("A store presenting a light property", () => {
	const authorStore = new Store(getAuthor, "_id");
	const bramStroker = authorStore.getObservable("bram-stoker");
	const bookStore = new Store(getLightBook).presentProperty("infos.author", authorStore);
	const draculaBook = bookStore.getObservable("dracula");

	it("Doesn't populate presented store", async () => {
		await bookStore.fetch("dracula");
		expect(bramStroker.get()).toBeNull();
	});

	it("Takes presented store value as source of truth", async () => {
		await authorStore.fetch("bram-stoker");
		expect(bramStroker.get()?._id).toEqual("bram-stoker");
		expect(bramStroker.get()?.age).toEqual(10);
		expect(draculaBook.get()?.infos.author.name).toEqual("Bram Stoker Original");
		authorStore.update("bram-stoker", (v) => ({ ...v, name: "New Bram Stoker" }));
		expect(draculaBook.get()?.infos.author.name).toEqual("New Bram Stoker");
	});
});

function getAuthor(id: string) {
	return {
		_id: id,
		name: id === "bram-stoker" ? "Bram Stoker Original" : "unknown",
		age: 10,
	};
}

interface Author {
	_id: string;
	name: string;
	age: number;
}
interface Book {
	id: string;
	title: string;
	infos: {
		published: Date;
		author: Author;
	};
}

function getBook(id: string): Book {
	return {
		id,
		title: "Dracula",
		infos: {
			published: new Date(),
			author: {
				_id: "bram-stoker",
				name: "Bram Stoker",
				age: 70,
			},
		},
	};
}

interface LightAuthor {
	_id: string;
	name: string;
}
interface LightBook {
	id: string;
	title: string;
	infos: {
		published: Date;
		author: LightAuthor;
	};
}
function getLightBook(id: string): LightBook {
	return {
		id,
		title: "Dracula",
		infos: {
			published: new Date(),
			author: {
				_id: "bram-stoker",
				name: "Bram Stoker",
			},
		},
	};
}

interface User {
	id: string;
	name: string;
	father?: User;
}
