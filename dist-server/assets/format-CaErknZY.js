//#region src/lib/format.ts
function formatKr(amount) {
	const hasDecimals = Math.abs(amount % 1) > .001;
	return new Intl.NumberFormat("da-DK", {
		style: "currency",
		currency: "DKK",
		minimumFractionDigits: 0,
		maximumFractionDigits: hasDecimals ? 2 : 0
	}).format(amount);
}
function formatDate(iso) {
	return new Intl.DateTimeFormat("da-DK", {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(new Date(iso));
}
function formatDateTime(iso) {
	return new Intl.DateTimeFormat("da-DK", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	}).format(new Date(iso));
}
function sumAmounts(rows) {
	return (rows ?? []).reduce((acc, row) => acc + Number(row.amount), 0);
}
function initials(name) {
	return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
function firstName(name) {
	return name.split(" ").filter(Boolean)[0] ?? name;
}
//#endregion
export { initials as a, formatKr as i, formatDate as n, sumAmounts as o, formatDateTime as r, firstName as t };
