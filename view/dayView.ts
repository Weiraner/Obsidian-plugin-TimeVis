import * as d3 from "d3";
import { App } from "obsidian";

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
export async function renderCalendar(app: App, container: HTMLElement, targetDate: string, days: number) {
	const filePath = `resource/CalendarEvent/${targetDate.slice(0,7)}.json`;
	
	if (await app.vault.adapter.exists(filePath)) {
		try {
			// get calendar data
			const jsonData = await app.vault.adapter.read(filePath);
			const allEvents = JSON.parse(jsonData);
			
			const filteredEvents = Array.from({ length: days }, (_, dayOffset) => {
				// Calculate the date for this offset
				const currentDate = new Date(targetDate);
				currentDate.setDate(currentDate.getDate() + dayOffset);
				const currentDay = String(currentDate.getDate()).padStart(2, '0');
				
				return allEvents.filter((event) => {
					const startDate = event.start.split(" ")[2];
					const endDate = event.end.split(" ")[2];
					return (startDate === currentDay || endDate === currentDay);
				});
			});

			container.style.width = `max(${days * (days==1?300:150)+50}px, ${(days==1?20:15) * days}%)`;
			// Remove the float: right and add margin auto when width reaches 100%
			const widthPercentage = (days==1?20:15) * days;
			if (widthPercentage >= 100) {
				container.style.margin = '0 auto';
				container.style.float = 'none';
			} else {
				container.style.float = 'right';
				container.style.margin = '0';
			}

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
			const monthMap: Record<number, string> = {
				1: "Jan",
				2: "Feb",
				3: "Mar",
				4: "Apr",
				5: "May",
				6: "Jun",
				7: "Jul",
				8: "Aug",
				9: "Sep",
				10: "Oct",
				11: "Nov",
				12: "Dec"
			};

			container.innerHTML = "";
			const svg = d3
				.select(container)
				.append("svg")
				.attr("width", days * (days==1?300:150)+50)
				.attr("height", 1260); // 增加高度以容纳 header

			// white background
			svg.append("rect")
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", days * (days==1?300:150)+50)
				.attr("height", 1260)
				.attr("class", "timeline-bg");

			// // Add date header
			// const headerGroup = svg.append("g");
			
			// // Header background
			// headerGroup.append("rect")
			// 	.attr("x", 0)
			// 	.attr("y", 0)
			// 	.attr("width", days * (days==1?300:150)+50)
			// 	.attr("height", 40)
			// 	.attr("class", "timeline-bg")
			// 	.attr("rx", 5)
			// 	.attr("ry", 5);

			// // Format and display date
			// const formatDate = (dateStr: string) => {
			// 	const [year, month, day] = dateStr.split("-");
			// 	return `${monthMap[parseInt(month)]} ${day}`;
			// };

			// headerGroup.append("text")
			// 	.text(formatDate(targetDate))
			// 	.attr("x", 35)
			// 	.attr("y", 25)
			// 	.style("font-size", "18px")
			// 	.style("font-weight", "bold")
			// 	.style("fill", "#63605b");

			// Move existing content down
			const contentGroup = svg.append("g")
				.attr("transform", "translate(0,40)");

			const timeScale = d3.scaleLinear().domain([0, 1440]).range([0, 1200]); // total height

			const parseTime = (time: string): number => {
				const [year, month, day, hour, minute] = time.split(" ").map(Number);
				return hour * 60 + minute;
			};
			// filteredEvents.sort((a, b) => parseTime(a.start) - parseTime(b.start));

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
				contentGroup.append("line")
					.attr("x1", 30)
					.attr("x2", days * (days==1?300:150)+30)
					.attr("y1", y)
					.attr("y2", y)
					.attr("class", "timeline-line")
					.attr("stroke-width", 1);

				// hours
				contentGroup.append("text")
					.text(`${hour}:00`)
					.attr("x", 3)
					.attr("y", y + 3)
					.style("fill", "#63605b")
					.style("font-size", "10px")
					.style("font-weight", "bold");
			}

			// Add date headers for each day
			filteredEvents.forEach((events, dayOffset) => {
				const currentDate = new Date(targetDate);
				currentDate.setDate(currentDate.getDate() + dayOffset);
				
				const year = currentDate.getFullYear();
				const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
				const day = currentDate.getDate();
				
				const headerGroup = contentGroup
					.append("g")
					.attr("transform", `translate(${dayOffset * (days==1?300:150)}, 0)`);
				
				// Header background
				headerGroup.append("rect")
					.attr("x", 35)
					.attr("y", -30)
					.attr("width", days==1?300:150)
					.attr("height", 25)
					.attr("class", "timeline-bg")
					.attr("rx", 5)
					.attr("ry", 5);

				// Date text
				headerGroup.append("text")
					.text(`${monthMap[month]} ${day}, ${year}`)
					.attr("x", 45)
					.attr("y", -12)
					.style("font-size", "14px")
					.style("font-weight", "bold")
					.style("fill", "#63605b");
			});

			// rendering each event in calendar
			filteredEvents.forEach((events, dayOffset) => {
				events.forEach((event, eventIndex) => {
					const parseTime = (time: string): number => {
						const [year, month, day, hour, minute] = time
							.split(" ")
							.map(Number);

						const currentDate = new Date(targetDate);
						currentDate.setDate(currentDate.getDate() + dayOffset);
						const currentDay = currentDate.getDate();
						
						if (day === currentDay) return hour * 60 + minute;
						else if (day === currentDay + 1) return 1440;
						else return 0;
					};

					const startMinutes = parseTime(event.start);
					const endMinutes = parseTime(event.end);
					const duration =
						endMinutes - startMinutes > 0 ? endMinutes - startMinutes : 0;
					if (duration <= 0) return;

					const group = contentGroup
						.append("g")
						.attr("transform", `translate(${dayOffset * (days==1?300:150)}, ${timeScale(startMinutes) + 10})`);

					let xOffset = 0;
					let rectWidth = days==1?300:150;
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
					// title with ellipsis
					const titleText = group
						.append("text")
						.text(event.title)
						.attr("x", 45 + xOffset)
						.attr("y", textY)
						.style("fill", darkenColor(colorMap[event.calendar], 60))
						.style("font-size", fontSize)
						.style("font-weight", "bold");

					// Calculate maximum width for text (rectangle width minus padding)
					const maxWidth = rectWidth - 20;
					
					// Function to truncate text with ellipsis
					function truncateWithEllipsis(text: d3.Selection<SVGTextElement, unknown, null, undefined>, maxWidth: number) {
						const node = text.node();
						if (node) {
							let textContent = node.textContent || "";
							while (node.getComputedTextLength() > maxWidth && textContent.length > 0) {
								textContent = textContent.slice(0, -1);
								text.text(textContent + "...");
							}
						}
					}

					truncateWithEllipsis(titleText, maxWidth);

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
				});
			}
		catch (error) {
			console.error(`Error reading or parsing file at ${filePath}:`, error);
			container.textContent = `Error loading events for ${targetDate}. Check the console for details.`;
		}
	} else {
		container.textContent = `No data found for ${targetDate}. Expected file: ${filePath}`;
	}
}
