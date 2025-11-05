import React from "react";

const ProjectBadge = ({ color = "#000000", project, projects = null }) => {
  if (projects && Array.isArray(projects) && projects.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {projects.map((proj, index) => {
          const projectColor =
            proj.color && proj.color.trim() !== "" ? proj.color : "#000000";
          return (
            <div
              key={index}
              className="px-2 py-1 uppercase rounded-sm text-start w-fit"
              style={{
                color: projectColor,
                backgroundColor: `${projectColor}1A`,
              }}
            >
              <p className="!text-[15px] font-medium">{proj.name}</p>
            </div>
          );
        })}
      </div>
    );
  }

  const finalColor = color && color.trim() !== "" ? color : "#000000";
  return (
    <div
      className="px-2 py-1 uppercase rounded-sm text-start w-fit"
      style={{
        color: finalColor,
        backgroundColor: `${finalColor}1A`,
      }}
    >
      <p className="!text-[15px] font-medium">{project}</p>
    </div>
  );
};

export default ProjectBadge;
