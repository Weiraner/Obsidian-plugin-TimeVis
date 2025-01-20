import * as d3 from "d3";

// json format:
// {
//     "title": "Lunch",
//     "end": "2024 11 08 13 36",
//     "calendar": "Life",
//     "start": "2024 11 08 13 13"
//   }
//	Time format: {YYYY MM DD HH mm}
export interface CalendarEvent {
	title: string;
	start: string;
	end: string;
	calendar: string;
}

// get darkened color for title and time
function darkenColor(hex: string, amount: number): string {
	const [r, g, b] = hex.match(/\w\w/g)!.map((x) => parseInt(x, 16));
	const darken = (value: number) =>
		Math.max(0, Math.min(255, value - amount));
	return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
}

// render day calendar view
export function renderCalendar(
	events: CalendarEvent[],
	container: HTMLElement,
	targetDate: string
): void {
	const colorMap: Record<string, string> = {
		生活: "#a4e0af",
		睡觉: "#F1A0AF",
		运动: "#FFC2DB",
		课程: "#ebc890",
		作业: "#83a8d4",
		游戏和社媒: "#ff7f1a",
		社交活动: "#faec82",
		考试: "#ed6958",
		学习: "#96cbe3",
		兴趣: "#e99dfa",
		WarmUp: "#9dfae1",
		找工: "#96a2d9",
		杂事: "#c7d996",
		"Activity session": "#fcae53",
		工作项目: "#3a9c85",
	};

	container.innerHTML = "";
	const svg = d3
		.select(container)
		.append("svg")
		.attr("width", 350)
		.attr("height", 1220);

	// white background
	svg.append("rect")
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", 350)
		.attr("height", 1220)
		.attr("class", "timeline-bg");

	const timeScale = d3.scaleLinear().domain([0, 1440]).range([0, 1200]); // total height

	const parseTime = (time: string): number => {
		const [year, month, day, hour, minute] = time.split(" ").map(Number);
		return hour * 60 + minute;
	};
	events.sort((a, b) => parseTime(a.start) - parseTime(b.start));

	// detect if the titles woule overlap
	const detectOverlap = (
		eventA: CalendarEvent,
		eventB: CalendarEvent
	): boolean => {
		const startA = parseTime(eventA.start);
		const endA = parseTime(eventA.end);
		const startB = parseTime(eventB.start);
		const endB = parseTime(eventB.end);

		const heightA = timeScale(endA - startA) - timeScale(0);
		const heightB = timeScale(endB - startB) - timeScale(0);

		const fontSizeA = heightA < 8 ? 8 : heightA > 12 ? 12 : heightA;
		const fontSizeB = heightB < 8 ? 8 : heightB > 12 ? 12 : heightB;

		return (
			startB < endA &&
			startA < endB &&
			timeScale(startB) - timeScale(startA) < fontSizeA + fontSizeB // 字体可能重叠
		);
	};

	// background lines for each hour
	for (let hour = 0; hour <= 24; hour++) {
		const y = timeScale(hour * 60) + 10;

		// lines
		svg.append("line")
			.attr("x1", 30)
			.attr("x2", 350)
			.attr("y1", y)
			.attr("y2", y)
			.attr("class", "timeline-line")
			.attr("stroke-width", 1);

		// hours
		svg.append("text")
			.text(`${hour}:00`)
			.attr("x", 3)
			.attr("y", y + 3)
			.style("fill", "#63605b")
			.style("font-size", "10px")
			.style("font-weight", "bold");
	}

	// rendering each event in calendar
	events.forEach((event, eventIndex) => {
		const parseTime = (time: string): number => {
			const [year, month, day, hour, minute] = time
				.split(" ")
				.map(Number);

			const targetDay = targetDate.replace(/-/g, " ").split(" ")[2];
			if (day === Number(targetDay)) return hour * 60 + minute;
			else if (Number(day) === Number(targetDay) + 1) return 1440;
			else return 0;
		};

		const startMinutes = parseTime(event.start);
		const endMinutes = parseTime(event.end);
		const duration =
			endMinutes - startMinutes > 0 ? endMinutes - startMinutes : 0;
		if (duration <= 0) return;

		const group = svg
			.append("g")
			.attr("transform", `translate(0, ${timeScale(startMinutes) + 10})`);

		let xOffset = 0;
		let rectWidth = 300;
		for (let i = 0; i < eventIndex; i++) {
			// offset for overlap events
			if (detectOverlap(event, events[i])) {
				xOffset += 60;
				rectWidth -= 60;
			}
		}

		// colored rectangle for each event
		group
			.append("rect")
			.attr("x", 35 + xOffset)
			.attr("y", 0)
			.attr("width", rectWidth)
			.attr("height", timeScale(duration) - timeScale(0))
			.attr("fill", colorMap[event.calendar] + "33") // transparent
			.attr("rx", 5)
			.attr("ry", 5);

		// colored vertical line in the left of each event
		group
			.append("rect")
			.attr("x", 37 + xOffset)
			.attr("y", 2)
			.attr("width", 3)
			.attr("height", timeScale(duration) - timeScale(0) - 4)
			.attr("fill", colorMap[event.calendar]);

		const rectHeight = timeScale(duration) - timeScale(0);
		const fontSize = rectHeight < 8 ? 8 : rectHeight > 12 ? 12 : rectHeight;
		const textY =
			rectHeight < fontSize + 2
				? rectHeight / 2 + fontSize / 3
				: fontSize;
		// title
		group
			.append("text")
			.text(event.title)
			.attr("x", 45 + xOffset)
			.attr("y", textY)
			.style("fill", darkenColor(colorMap[event.calendar], 60)) // 与背景颜色同色系
			.style("font-size", fontSize)
			.style("font-weight", "bold");

		// duration time
		if (duration > 30) {
			const hours = Math.floor(duration / 60);
			const minutes = duration % 60;

			let timeText = "";

			if (hours > 0) {
				timeText += `${hours}h `;
			}

			if (minutes > 0) {
				timeText += `${minutes}min`;
			}
			group
				.append("text")
				.text(timeText.trim())
				.attr("x", 45 + xOffset)
				.attr("y", 26)
				.style("fill", darkenColor(colorMap[event.calendar], 60)) // 与背景颜色同色系
				.style("font-size", "10px");
		}

		// detailed time
		if (duration > 55) {
			group
				.append("svg")
				.attr("x", 45 + xOffset)
				.attr("y", 31)
				.attr("width", 10)
				.attr("height", 10)
				.style("fill", darkenColor(colorMap[event.calendar], 60))
				.html(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M464 256A208 208 0 1 1 48 256a208 208 0 1 1 416 0zM0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>'
				);

			group
				.append("text")
				.text(
					`${event.start.split(" ")[3]}:${
						event.start.split(" ")[4]
					} - ${event.end.split(" ")[3]}:${event.end.split(" ")[4]}`
				)
				.attr("x", 60 + xOffset)
				.attr("y", 40)
				.style("fill", darkenColor(colorMap[event.calendar], 40))
				.style("font-size", "10px");
		}
	});
}
