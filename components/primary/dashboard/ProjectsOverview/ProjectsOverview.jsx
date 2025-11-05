"use client"

import React, { useState, useEffect } from 'react'
import { Pie, PieChart, Legend } from "recharts"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

const ProjectsOverview = () => {
    const [projects, setProjects] = useState([])
    const [chartData, setChartData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch('/api/Projects')
                const data = await response.json()
                if (data.projects) {
                    setProjects(data.projects)
                    const transformedData = data.projects
                        .filter(project => project.totalStocks > 0)
                        .map((project, index) => ({
                            projectName: project.projectName,
                            totalStocks: project.totalStocks,
                            fill: project.color || `hsl(var(--chart-${(index % 5) + 1}))`,
                            productCount: project.productCount,
                            rackCount: project.rackCount
                        }))
                        .sort((a, b) => b.totalStocks - a.totalStocks)
                        .slice(0, 8)
                    setChartData(transformedData)
                }
            } catch (error) {
                console.error('Error fetching projects:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchProjects()
    }, [])

    const chartConfig = chartData.reduce((config, project, index) => {
        config[project.projectName] = {
            label: project.projectName,
            color: project.fill,
        }
        return config
    }, {
        totalStocks: {
            label: "Total Stock Items",
        },
    })

    if (loading) {
        return (
            <Card className="flex flex-col border-none">
                    <h2>Projects Overview</h2>
                <CardContent className="flex-1 pb-0">
                    <div className="flex items-center justify-center h-[350px] w-full">
                        <Skeleton className="h-[350px] w-[350px] rounded-full" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (chartData.length === 0) {
        return (
            <Card className="flex flex-col border-none">
                    <h2>Projects Overview</h2>
                <CardContent className="flex-1 pb-0">
                    <div className="flex items-center justify-center h-[250px]">
                        <div className="text-center">
                            <div className="mb-2 text-lg text-muted-foreground">No projects with stock found</div>
                            <div className="text-sm text-muted-foreground">Projects will appear here once they have inventory items</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const totalItems = chartData.reduce((sum, project) => sum + project.totalStocks, 0)
    const topProject = chartData[0]
    const growthPercentage = chartData.length > 1 ? 
        ((topProject.totalStocks / totalItems) * 100).toFixed(1) : 0

    return (
        <Card className="flex flex-col border-none">
                <h2>Projects Overview</h2>
            <CardContent className="flex-1 rounded-lg" style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}>
                <ChartContainer
                    config={chartConfig}
                    className="relative w-full"
                    style={{ height: '450px' }}
                >
                    <PieChart width={450} height={450} style={{ position: 'absolute', left: '0' }}>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel className="bg-white border border-gray-200 shadow-lg" />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="totalStocks"
                            nameKey="projectName"
                            innerRadius={100}
                            cx={200}
                        />
                        <Legend 
                            layout="vertical"
                            align="right"
                            verticalAlign="center"
                            iconType="circle"
                            iconSize={8}
                            formatter={(value, entry) => {
                                const project = chartData.find(p => p.projectName === value);
                                let percentage = (project.totalStocks / totalItems) * 100;
                                const displayPercentage = percentage < 0.1 && percentage > 0 
                                    ? percentage.toFixed(3)
                                    : percentage.toFixed(1);
                                return (
                                    <span style={{ color: '#666', fontSize: '15px', marginBottom: '8px' }}>
                                        {value} ({displayPercentage}%)
                                    </span>
                                );
                            }}
                        />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export default ProjectsOverview