import { createStore } from "../src/store";

interface Article {
	id: string;
	title: string;
	content: string;
}

const articleStore = createStore({
	list: (page: number) => ({
		page,
		total_pages: 0,
		total_size: 0,
		content: [
			{
				id: "n°1-" + page,
				title: "Yes",
				content: "yesyesy",
			},
			{
				id: "n°2-" + page,
				title: "yop",
				content: "yopyop",
			},
		],
	}),
});

const articles = articleStore.paginatedItems;

articles.subscribe((newA) => console.log(newA));

articleStore.list();
articleStore.listMore();
articleStore.list();
