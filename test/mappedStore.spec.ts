import { MappedStore } from "../src/stores/mappedStore";
import { Store } from "../src/stores/store";

describe("A simple mapped Store", () => {
	const reviewStore = new MappedStore((bookId, page) => ({
		page,
		totalPages: 0,
		totalSize: 0,
		content: [bookId + ": Item 1-" + page, bookId + ": Item 2-" + page],
	}));

	const observedReviews = reviewStore.getObservableItems("Dracula");

	test("Concat new pages to paginated items", async () => {
		expect(observedReviews.get()).toBeNull();
		await reviewStore.list("Gargantua");
		expect(observedReviews.get()).toBeNull();
		await reviewStore.list("Dracula");
		expect(observedReviews.get()?.content).toHaveLength(2);
		await reviewStore.listMore("Dracula");
		await reviewStore.listMore("Dracula");
		await reviewStore.listMore("Dracula");
		expect(observedReviews.get()?.content).toHaveLength(8);
		expect(observedReviews.get()?.content[7]).toEqual("Dracula: Item 2-3");
		await reviewStore.list("Dracula");
		expect(observedReviews.get()?.content).toHaveLength(2);
		reviewStore.clear();
		expect(observedReviews.get()).toBeNull();
	});
});

describe("A mapped store binding items stored by ids", () => {
	const reviewStore = new Store(
		(id) => ({
			_id: id,
			title: "Fetched",
		}),
		"_id"
	);
	const mappedReviewStore = new MappedStore((bookId, page) => ({
		page,
		totalPages: 2,
		totalSize: 4,
		content: [
			{ _id: bookId + ": 1-" + page, title: bookId + ": Item 1-" + page },
			{ _id: bookId + ": 2-" + page, title: bookId + ": Item 2-" + page },
		],
	})).bind(reviewStore);

	const observedReviewList = mappedReviewStore.getObservableItems("Dracula");
	const secondReview = reviewStore.getObservable("Dracula: 2-0");

	test("Last fetched version of book is used in observable", async () => {
		expect(secondReview.get()).toBeNull();
		await reviewStore.fetch("Dracula: 2-0");
		expect(secondReview.get()?.title).toEqual("Fetched");
		await mappedReviewStore.list("Gargantua");
		expect(secondReview.get()?.title).toEqual("Fetched");
		await mappedReviewStore.list("Dracula");
		expect(secondReview.get()?.title).toEqual("Dracula: Item 2-0");
		await mappedReviewStore.listMore("Dracula");
		expect(secondReview.get()?.title).toEqual("Dracula: Item 2-0");
		expect(observedReviewList.get()?.content[1]?.title).toEqual("Dracula: Item 2-0");
		await reviewStore.fetch("Dracula: 2-0");
		expect(secondReview.get()?.title).toEqual("Fetched");
		expect(observedReviewList.get()?.content[1]?.title).toEqual("Fetched");
		expect(observedReviewList.get()?.content).toHaveLength(4);
	});

	test("Removed items from map are not presented in list", async () => {
		expect(observedReviewList.get()?.content).toHaveLength(4);
		reviewStore.remove("Dracula: 2-0");
		expect(secondReview.get()).toBeNull();
		expect(observedReviewList.get()?.content).toHaveLength(3);
		await reviewStore.fetch("Dracula: 2-0");
		expect(secondReview.get()?.title).toEqual("Fetched");
		expect(observedReviewList.get()?.content).toHaveLength(4);
	});
});

// Used in observable list
// Updated when listing
// Not added when fetching

describe("A mapped store presenting items stored by ids", () => {
	const reviewStore = new Store((id) => ({
		id,
		title: "Fetched",
		content: "Review content",
	}));
	const mappedReviewStore = new MappedStore((bookId, page) => ({
		page,
		totalPages: 2,
		totalSize: 4,
		content: [
			{ id: bookId + ": 1-" + page, title: bookId + ": Item 1-" + page },
			{ id: bookId + ": 2-" + page, title: bookId + ": Item 2-" + page },
		],
	})).present(reviewStore);

	const observedReviewList = mappedReviewStore.getObservableItems("Dracula");
	const firstReview = reviewStore.getObservable("Dracula: 1-0");
	const secondReview = reviewStore.getObservable("Dracula: 2-0");

	test("Last fetched version of book is used in observable", async () => {
		expect(secondReview.get()).toBeNull();
		await reviewStore.fetch("Dracula: 2-0");
		expect(secondReview.get()?.title).toEqual("Fetched");
		expect(secondReview.get()?.content).toEqual("Review content");
		await mappedReviewStore.list("Gargantua");
		expect(secondReview.get()?.title).toEqual("Fetched");
		await mappedReviewStore.list("Dracula");
		expect(firstReview.get()).toBeNull();
		expect(secondReview.get()?.title).toEqual("Dracula: Item 2-0");
		await mappedReviewStore.listMore("Dracula");
		expect(secondReview.get()?.title).toEqual("Dracula: Item 2-0");
		expect(observedReviewList.get()?.content[0]?.title).toEqual("Dracula: Item 1-0");
		expect(observedReviewList.get()?.content[1]?.title).toEqual("Dracula: Item 2-0");
		await reviewStore.fetch("Dracula: 2-0");
		expect(secondReview.get()?.title).toEqual("Fetched");
		expect(observedReviewList.get()?.content[1]?.title).toEqual("Fetched");
		expect(observedReviewList.get()?.content).toHaveLength(4);
	});

	test("Removed items from map are not presented in list", async () => {
		expect(observedReviewList.get()?.content).toHaveLength(4);
		reviewStore.remove("Dracula: 2-0");
		expect(secondReview.get()).toBeNull();
		expect(observedReviewList.get()?.content).toHaveLength(3);
		await reviewStore.fetch("Dracula: 2-0");
		expect(secondReview.get()?.title).toEqual("Fetched");
		expect(observedReviewList.get()?.content).toHaveLength(4);
	});
});
