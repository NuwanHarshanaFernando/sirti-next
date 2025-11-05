import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import NumberInput from "@/components/shared/number-input";
import SecondaryMultiSelect from "@/components/shared/secondary-multi-select";
import { Input } from "@/components/ui/input";

const ProjectsInfoTable = ({
  projectsInfo = [],
  projectRackOptions = {},
  onProjectsInfoChange,
}) => {
  const [localProjectsInfo, setLocalProjectsInfo] = useState(projectsInfo);

  useEffect(() => {
    setLocalProjectsInfo(projectsInfo);
  }, [projectsInfo]);


  const updateParent = (updatedData) => {
    if (onProjectsInfoChange) {
      onProjectsInfoChange(updatedData);
    }
  };

  const handleStockOnHandChange = (index, value) => {
    setLocalProjectsInfo((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], stockOnHand: value };
      updateParent(updated);
      return updated;
    });
  };

  const handleAdjustStockChange = (index, value) => {
    setLocalProjectsInfo((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], adjustStock: value };
      updateParent(updated);
      return updated;
    });
  };

  const handleRacksChange = (index, value) => {
    setLocalProjectsInfo((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], racks: value };
      updateParent(updated);
      return updated;
    });
  };

  const handleReasonChange = (index, value) => {
    setLocalProjectsInfo((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], reasonForAdjustment: value };
      updateParent(updated);
      return updated;
    });
  };
  return (
    <div className="flex flex-col gap-5">
      <Table className="!p-10">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Project</TableHead>
            <TableHead className="w-1/5">Stock on hand</TableHead>
            <TableHead className="w-1/5">ADJUST STOCK</TableHead>
            <TableHead className="w-1/5 text-left">RACKS</TableHead>
            <TableHead className="text-left">REASON FOR ADJUSTMENT</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localProjectsInfo.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                No projects found. Please create a project first.
              </TableCell>
            </TableRow>
          ) : (
            localProjectsInfo.map((item, index) => (
              <TableRow key={item.id || `${item.projectName}-${index}`}>
                <TableCell>
                  <div className="flex flex-row items-center justify-start w-full gap-2 px-3 py-3 border rounded-lg border-black/10">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{
                        backgroundColor: item.projectColor || "#E27100",
                      }}
                    />
                    <p className="!text-[15px]">{item.projectName}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <NumberInput
                    value={item.stockOnHand}
                    onChange={(value) => handleStockOnHandChange(index, value)}
                  />
                </TableCell>
                <TableCell>
                  <NumberInput
                    value={item.adjustStock}
                    onChange={(value) => handleAdjustStockChange(index, value)}
                  />
                </TableCell>
                <TableCell className="text-center">
                  {projectRackOptions[item.projectId] &&
                  projectRackOptions[item.projectId].length > 0 ? (
                    <SecondaryMultiSelect
                      label="Racks"
                      placeholder="Select racks"
                      options={projectRackOptions[item.projectId]}
                      value={item.racks || []}
                      onValueChange={(value) => handleRacksChange(index, value)}
                    />
                  ) : (
                    <div className="py-2 text-sm text-gray-500">
                      No racks assigned to this project
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-end">
                  <Input
                    placeholder="REASON FOR ADJUSTMENT"
                    value={item.reasonForAdjustment || ""}
                    onChange={(e) => handleReasonChange(index, e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProjectsInfoTable;
