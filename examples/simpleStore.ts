import { createStore } from "../src/store";

interface Article {
	id: string;
	title: string;
	content: string;
}
const articleStore = createStore({
	fetch: (id: string) => ({
		id,
		title: "Hello",
		content: "Bonjour",
	}),
	list: () => ({
		content_size: 0,
		page: 0,
		page_size: 0,
		total_pages: 0,
		total_size: 0,
		content: [
			{
				id: "no",
				title: "NO",
				content: "Nonono",
			},
			{
				id: "123",
				title: "From list",
				content: "From the list",
			},
		],
	}),
});

const article = articleStore.getObservable("123");
article.subscribe((article) => console.log("article changed", article));
console.log("go");

articleStore.fetch("123");
articleStore.save({
	id: "123",
	title: "New Hello",
	content: "Bonjour !",
});
articleStore.list();
articleStore.remove("123");
articleStore.list();
