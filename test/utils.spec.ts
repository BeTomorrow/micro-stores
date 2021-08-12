import { presentItems } from "../src/utils";

describe("Presentation of items", () => {
	const fetchedBooks = new Map([
		["id1", { id: "id1", title: "One" }],
		["id5", { id: "id5", title: "Five" }],
	]);
	const listedBooks = {
		content: [
			{ id: "id1", title: "one" },
			{ id: "id2", title: "two" },
			{ id: "id3", title: "three" },
			{ id: "id4", title: "four" },
		],
		page: 0,
		total_pages: 1,
		total_size: 1,
	};
	const result = presentItems(fetchedBooks, listedBooks, new Set(["id2"]));

	it("Replaces the items from list presentation with the reference store", () => {
		expect(result?.content[0]?.title).toEqual("One");
	});
	it("Fallbacks to presented items it is not deleted", () => {
		expect(result?.content).toHaveLength(3);
		expect(result?.content[1]?.title).toEqual("three");
		expect(result?.content[2]?.title).toEqual("four");
	});
});
