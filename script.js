let isAdmin = false;

// stores degree plan data
let degreeData = {};

// retrieve data, if data is in localstorage, it's rendered from there. if not, fetch json and then store it in localstorage
function loadAcademicMapData() {
    let storedData = localStorage.getItem("courseData");
    if (storedData) {
        degreeData = JSON.parse(storedData);
        console.log("Loaded data from localStorage:", degreeData);
    } else {
        fetch("courses.json")
            .then((response) => response.json())
            .then((data) => {
                degreeData = data;
                localStorage.setItem("courseData", JSON.stringify(data));
                if (isAdmin) {
                    renderCourses(data.allCourses);
                }
                console.log("Loaded data from JSON file:", degreeData);
            });
    }
}

// loads data soon as html loads
document.addEventListener("DOMContentLoaded", function () {
    loadAcademicMapData();
});

// retrieves & parses course data from local storage if avail.
function getCourseDetails(courseCode) {
    const storedData = JSON.parse(localStorage.getItem("courseData"));

    // renders from local storage, else renders from json data
    if (storedData && storedData.allCourses && storedData.allCourses[courseCode]) {
        console.log(`Course details from localStorage for ${courseCode}:`, storedData.allCourses[courseCode]);
        return storedData.allCourses[courseCode];
    } else {
        console.log(`Course details from degreeData for ${courseCode}:`, degreeData.allCourses[courseCode]);
        return degreeData.allCourses[courseCode];
    }
}

// renders table for degree plan
function showPlan(planName) {
    // store plan name in local storage
    localStorage.setItem("currentDegreePlan", planName);
    let planDetails = document.getElementById("planDetails");
    // iterates thru degreedata to find item that matches the planName
    let selectedPlan = degreeData.degreePlans.find((plan) => plan.name === planName);
    console.log("Selected Plan:", selectedPlan);

    // variable to keep track of total credit hrs
    let totalFourYearHours = 0;

    if (!selectedPlan) {
        planDetails.innerHTML = "<p>Plan not found.</p>";
        return;
    }

    let coursesInPlan = new Set();
    selectedPlan.academicMap.forEach((year) => {
        year.semesters.forEach((semester) => {
            semester.courses.forEach((course) => {
                if (typeof course === "string") {
                    coursesInPlan.add(course);
                } else if (course.dropdownList) {
                    // If it's a dropdown, add all options in the dropdown
                    degreeData.dropdownLists[course.dropdownList].forEach((courseCode) => coursesInPlan.add(courseCode));
                }
            });
        });
    });

    // make html
    let planDetailsHTML = `
        <h2>${selectedPlan.college}</h2>
        <h3>${selectedPlan.degreeType}, ${planName}</h3>
        <p>${isAdmin ? "Click a course code to modify data" : "Click a course code to view more details"}</p>`;

    // iterates through the degreeplan for each year to create tabl
    selectedPlan.academicMap.forEach((year, j) => {
        planDetailsHTML += `
        <table class="table table-bordered">
            <thead>
                <tr><th class="year" colspan="7">YEAR ${year.year}</th></tr>
                <tr>
                    <th colspan="3">Semester 1 Fall</th>
                    <th colspan="3">Semester 2 Spring</th>
                    <th colspan="1">Total</th>
                </tr>
            </thead>
            <tbody>`;
        let semesters = year.semesters;
        // compares which semester is longer
        let maxCourses = Math.max(semesters[0].courses.length, semesters[1].courses.length);
        let semester1TotalHours = 0;
        let semester2TotalHours = 0;

        for (let i = 0; i < maxCourses; i++) {
            let uniqueSelectIdSemester1 = "year" + j + "semester1SelectID" + i;
            let uniqueSelectIdSemester2 = "year" + j + "semester2SelectID" + i;

            planDetailsHTML += "<tr>";

            // Semester 1 Courses
            if (semesters[0].courses[i]) {
                planDetailsHTML += generateCourseCell(semesters[0].courses[i], uniqueSelectIdSemester1);
                semester1TotalHours += getCourseHours(semesters[0].courses[i]);
            } else {
                planDetailsHTML += "<td colspan='3'></td>";
            }

            // Semester 2 Courses
            if (semesters[1].courses[i]) {
                planDetailsHTML += generateCourseCell(semesters[1].courses[i], uniqueSelectIdSemester2);
                semester2TotalHours += getCourseHours(semesters[1].courses[i]);
            } else {
                planDetailsHTML += "<td colspan='3'></td>";
            }

            // add blank cell under the "Total" column if it's not the first course row
            planDetailsHTML += "<td></td></tr>";
        }
        if (isAdmin) {
            planDetailsHTML += "<tr>";

            // Semester 1 Add Course Dropdown
            let semester1DropdownID = `addCourseYear${year.year}Semester1`;
            planDetailsHTML += `
        <td colspan="3">
            <select id="${semester1DropdownID}">
                <option value="">Add a Course</option>`;
            Object.keys(degreeData.allCourses).forEach((courseCode) => {
                if (!coursesInPlan.has(courseCode)) {
                    // Exclude courses already in the plan
                    planDetailsHTML += `<option value="${courseCode}">${courseCode}</option>`;
                }
            });
            planDetailsHTML += `
            </select>
            <button onclick="addCourseToPlan(document.getElementById('${semester1DropdownID}').value, ${year.year}, 1)">Add to Semester 1</button>
        </td>`;

            // Semester 2 Add Course Dropdown
            let semester2DropdownID = `addCourseYear${year.year}Semester2`;
            planDetailsHTML += `
        <td colspan="3">
            <select id="${semester2DropdownID}">
                <option value="">Add a Course</option>`;
            Object.keys(degreeData.allCourses).forEach((courseCode) => {
                if (!coursesInPlan.has(courseCode)) {
                    planDetailsHTML += `<option value="${courseCode}">${courseCode}</option>`;
                }
            });
            planDetailsHTML += `
            </select>
            <button onclick="addCourseToPlan(document.getElementById('${semester2DropdownID}').value, ${year.year}, 2)">Add to Semester 2</button>
        </td>`;

            planDetailsHTML += "</tr>";
        }

        planDetailsHTML += `
            <tr>
                <td colspan="2">Semester 1 Total Hours</td>
                <td colspan="1">${semester1TotalHours}</td>
                <td colspan="2">Semester 2 Total Hours</td>
                <td colspan="1">${semester2TotalHours}</td>
                <td>Total: ${semester1TotalHours + semester2TotalHours}</td>
            </tr>
            `;

        totalFourYearHours += semester1TotalHours + semester2TotalHours;

        planDetailsHTML += `</tbody></table>`;
    });

    planDetailsHTML += `
            <table class="table table-bordered">
            <tfoot>
                <tr>
                    <td colspan="6" class="text-right">Total 4-Year Hours</td>
                    <td>${totalFourYearHours}</td>
                </tr>
            </tfoot>
            </table>`;

    planDetails.innerHTML = planDetailsHTML;
    loadStoredValues();
}

function getCourseHours(course) {
    if (typeof course === "string") {
        return degreeData.allCourses[course].creditHours || 0;
    } else {
        // if the course has a dropdown, return the hours of the first option as a default
        return degreeData.allCourses[degreeData.dropdownLists[course.dropdownList][0]].creditHours || 0;
    }
}

// creates course cells , plugs into showPlan()
function generateCourseCell(course, uniqueSelectId) {
    // console.log("generateCourseCell called with:", course, uniqueSelectId);

    if (typeof course === "string") {
        // fetch course details from correct source
        const courseDetails = getCourseDetails(course);
        console.log(`Course details for ${course}:`, courseDetails);

        // Check if courseDetails is undefined
        if (!courseDetails) {
            console.error(`Course details not found for code: ${course}`);
            return `<td colspan='3'>Course details not available</td>`;
        }

        if (isAdmin) {
            return `
                <td colspan="1" class="clickable" onclick="showModal('${course}')">${course}</td>
                <td colspan="1"><button onclick="removeCourseFromPlan('${course}')">Remove Course</button>${courseDetails.courseName}</td>
                <td colspan="1">${courseDetails.creditHours}</td>
                `;
        }

        //return the cell HTML with an onclick event that calls showModal passing the course code
        return `
            <td colspan="1" class="clickable" onclick="showModal('${course}')">${course}</td>
            <td colspan="1">${courseDetails.courseName}</td>
            <td colspan="1">${courseDetails.creditHours}</td>`;
    } else {
        // courses that require a dropdown selection, uniqueselectId to help track and store selections
        let cellHTML = `<td id="${uniqueSelectId}CourseNumber">${course.courseCode}</td>`;
        cellHTML += `<td colspan="1"><select id="${uniqueSelectId}" onchange="updateCourseDetails('${uniqueSelectId}', this.value); storeCellValue(this)">`;
        cellHTML += `<option value="">Select a course</option>`;

        degreeData.dropdownLists[course.dropdownList].forEach((dropdownCourseCode) => {
            const dropdownCourseDetails = getCourseDetails(dropdownCourseCode);
            cellHTML += `<option value="${dropdownCourseCode}">${dropdownCourseDetails ? dropdownCourseDetails.courseName : "Unknown"}</option>`;
        });

        cellHTML += `</select></td>`;
        cellHTML += `<td id="${uniqueSelectId}CreditHours"></td>`;
        return cellHTML;
    }
}

function updateCourseDetails(uniqueSelectId, selectedCourseCode) {
    const courseNumberCell = document.getElementById(`${uniqueSelectId}CourseNumber`);
    const creditHoursCell = document.getElementById(`${uniqueSelectId}CreditHours`);

    if (selectedCourseCode) {
        const courseDetails = degreeData.allCourses[selectedCourseCode];
        courseNumberCell.innerText = selectedCourseCode; // update course number
        creditHoursCell.innerText = courseDetails.creditHours; // update credit hours

        // onclick attribute to call showModal with the new course code
        courseNumberCell.setAttribute("onclick", `showModal('${selectedCourseCode}')`);
        courseNumberCell.classList.add("clickable");
    } else {
        // reset if no course is selected
        courseNumberCell.innerText = "";
        creditHoursCell.innerText = "";

        // remove the onclick attribute if no course is selected
        courseNumberCell.removeAttribute("onclick");
        courseNumberCell.classList.remove("clickable");
    }
    const selectElement = document.getElementById(uniqueSelectId);
    storeCellValue(selectElement);
}

function showModal(courseCode, year, semester) {
    const courseDetails = getCourseDetails(courseCode);
    if (!courseDetails) {
        console.error(`Course details not found for code: ${courseCode}`);
        return;
    }

    const modal = document.getElementById("courseModal");
    const modalContent = document.getElementById("courseModalContent");
    modalContent.innerHTML = "";

    if (isAdmin) {
        // Admin page: show form for editing
        modalContent.innerHTML = `
                <form id="editCourseForm" class='edit-form'>
                    <h3>Edit Course</h3>
                    <label for="courseCode">Course Code:</label>
                    <input type="text" id="courseCode" name="courseCode" disabled value="${courseCode}">
                    <label for="courseName">Course Name:</label>
                    <input type="text" id="courseName" name="courseName" value="${courseDetails.courseName}">
                    <label for="courseHours">Credit Hours:</label>
                    <input type="number" id="courseHours" name="courseHours" value="${courseDetails.creditHours}">
                    <label for="courseDescription">Description:</label>
                    <textarea id="courseDescription" name="courseDescription" style="height: 100px;">${courseDetails.Description}</textarea>
                    <div style="margin-top:14px">
                        <button type="button" class="btn btn-success" onclick="saveEditedCourse()">Save Changes</button>
                        <button type="button" class="btn btn-danger" onclick="removeCourseFromPlan('${courseCode}')" >Remove Course</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
                    </div>
                </form>
            `;
    } else {
        // Student view: show course details
        modalContent.innerHTML = `
                <h3>${courseCode} - ${courseDetails.courseName}</h3>
                <p>Credit Hours: ${courseDetails.creditHours}</p>
                <h4>Description:</h4>
                <p>${courseDetails.Description}</p>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
            `;
    }
    modal.style.display = "block";
}

function closeModal() {
    document.getElementById("courseModal").style.display = "none";
}

function addCourseToPlan(courseCode, year, semesterNumber) {
    if (!courseCode) {
        alert("Please select a course to add.");
        return;
    }
    const currentDegreePlan = localStorage.getItem("currentDegreePlan");
    let selectedPlan = degreeData.degreePlans.find((plan) => plan.name === currentDegreePlan);

    if (!selectedPlan) {
        alert("Degree plan not found.");
        return;
    }
    // Locate the correct year and semester
    let selectedYear = selectedPlan.academicMap.find((y) => y.year === year);
    if (!selectedYear) {
        alert("Selected year not found in the degree plan.");
        return;
    }

    let selectedSemester = selectedYear.semesters[semesterNumber - 1];

    if (selectedSemester.courses.length >= 5) {
        alert("Cannot add more than 5 courses to a semester.");
        return;
    }

    // Check if the course is already in the semester
    if (selectedSemester.courses.includes(courseCode)) {
        alert("This course is already in the semester.");
        return;
    }

    // Add the course to the semester
    selectedSemester.courses.push(courseCode);

    // Update localStorage
    localStorage.setItem("courseData", JSON.stringify(degreeData));

    // Refresh the display of the degree plan
    showPlan(currentDegreePlan);
}

function removeCourseFromPlan(courseCode) {
    const currentDegreePlan = localStorage.getItem("currentDegreePlan");
    let selectedPlan = degreeData.degreePlans.find((plan) => plan.name === currentDegreePlan);

    if (!selectedPlan) {
        alert("Degree plan not found.");
        return;
    }

    // Iterate through the degree plan to find and remove the course
    for (const year of selectedPlan.academicMap) {
        for (const semester of year.semesters) {
            const courseIndex = semester.courses.indexOf(courseCode);
            if (courseIndex !== -1) {
                // Remove the course from the semester
                semester.courses.splice(courseIndex, 1);

                // Update localStorage
                localStorage.setItem("courseData", JSON.stringify(degreeData));

                // Refresh the display of the degree plan
                showPlan(currentDegreePlan);

                // Close the modal
                closeModal();

                return; // Exit the function after removing the course
            }
        }
    }

    alert("Course not found in the degree plan.");
}
