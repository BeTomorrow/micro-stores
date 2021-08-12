import { Store } from "../src/stores/store";

describe("A simple store referencing items by ids", () => {
	const bookStore = new Store((id) => ({
		id,
		title: "Fetched",
	}));

	const observedBook = bookStore.getObservable("tested");

	test("Updates the observed item when fetching, saving or deleting", async () => {
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
	});
});

describe("A store using references to another", () => {
	const authorStore = new Store(getAuthor);

	const bramStroker = authorStore.getObservable("bram-stoker");

	const bookStore = new Store(getBook).bindProperty("infos.author", authorStore);
	const dracula = bookStore.getObservable("dracula");

	it("Update the referenced store when fetching object", async () => {
		expect(bramStroker.get()).toBeNull();
		await bookStore.fetch("dracula");
		expect(bramStroker.get()?.id).toEqual("bram-stoker");
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

function getAuthor(id: string) {
	return {
		id,
		name: id === "bram-stoker" ? "Bram Stoker Original" : "unknown",
		age: 10,
	};
}

interface Author {
	id: string;
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
				id: "bram-stoker",
				name: "Bram Stoker",
				age: 70,
			},
		},
	};
}

interface User {
	id: string;
	name: string;
	father?: User;
}
