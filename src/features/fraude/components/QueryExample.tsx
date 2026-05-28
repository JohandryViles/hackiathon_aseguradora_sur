import { FileSearch } from "lucide-react";

type QueryExampleProps = {
	text: string;
};

export function QueryExample({ text }: QueryExampleProps) {
	return (
		<div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 dark:bg-slate-950">
			<FileSearch aria-hidden className="shrink-0 text-slate-500" size={16} />
			<span>{text}</span>
		</div>
	);
}
