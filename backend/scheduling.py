from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import networkx as nx


@dataclass
class Task:
    id: str
    name: str
    duration_days: int
    dependencies: List[str]
    resources_required: Dict[str, float]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_milestone: bool = False
    is_critical: bool = False
    float_days: int = 0


@dataclass
class ScheduleResult:
    tasks: List[Task]
    project_duration: int
    project_end_date: datetime
    critical_path: List[str]
    resource_utilisation: Dict[str, List[float]]


class SchedulingEngine:
    @staticmethod
    def calculate_critical_path_method(tasks: List[Task], project_start_date: datetime) -> ScheduleResult:
        """
        Calculate Critical Path Method (CPM) for project scheduling
        Returns scheduled tasks, project duration, critical path and resource utilisation
        """
        # Create directed acyclic graph
        G = nx.DiGraph()
        
        task_map = {task.id: task for task in tasks}
        
        # Add nodes and edges
        for task in tasks:
            G.add_node(task.id, duration=task.duration_days)
            for dep_id in task.dependencies:
                G.add_edge(dep_id, task.id)
        
        # Check for cycles
        if not nx.is_directed_acyclic_graph(G):
            raise ValueError("Project schedule contains cyclic dependencies")
        
        # Forward pass (early start / early finish)
        topological_order = list(nx.topological_sort(G))
        
        early_start = {}
        early_finish = {}
        
        for task_id in topological_order:
            task = task_map[task_id]
            predecessors = list(G.predecessors(task_id))
            
            if not predecessors:
                early_start[task_id] = 0
            else:
                early_start[task_id] = max(early_finish[pred] for pred in predecessors)
            
            early_finish[task_id] = early_start[task_id] + task.duration_days
        
        # Backward pass (late start / late finish)
        late_start = {}
        late_finish = {}
        
        project_duration = max(early_finish.values())
        
        for task_id in reversed(topological_order):
            task = task_map[task_id]
            successors = list(G.successors(task_id))
            
            if not successors:
                late_finish[task_id] = project_duration
            else:
                late_finish[task_id] = min(late_start[succ] for succ in successors)
            
            late_start[task_id] = late_finish[task_id] - task.duration_days
        
        # Calculate float and identify critical path
        critical_path = []
        for task_id in topological_order:
            task = task_map[task_id]
            task.float_days = late_start[task_id] - early_start[task_id]
            task.is_critical = task.float_days == 0
            
            if task.is_critical:
                critical_path.append(task_id)
            
            # Set actual dates
            task.start_date = project_start_date + timedelta(days=early_start[task_id])
            task.end_date = project_start_date + timedelta(days=early_finish[task_id])
        
        # Calculate resource utilisation
        resources = set()
        for task in tasks:
            resources.update(task.resources_required.keys())
        
        resource_utilisation = {}
        for resource in resources:
            usage = [0.0] * project_duration
            for task in tasks:
                if resource in task.resources_required:
                    start = early_start[task.id]
                    end = early_finish[task.id]
                    rate = task.resources_required[resource]
                    for day in range(start, end):
                        usage[day] += rate
            resource_utilisation[resource] = usage
        
        return ScheduleResult(
            tasks=list(task_map.values()),
            project_duration=project_duration,
            project_end_date=project_start_date + timedelta(days=project_duration),
            critical_path=critical_path,
            resource_utilisation=resource_utilisation
        )

    @staticmethod
    def apply_resource_leveling(schedule: ScheduleResult, max_resource_limits: Dict[str, float]) -> ScheduleResult:
        """
        Apply resource leveling algorithm to smooth resource utilisation without exceeding limits
        """
        tasks = schedule.tasks
        current_day = 0
        adjusted = 0
        
        # Simple serial resource leveling
        while current_day < schedule.project_duration:
            for resource, limits in max_resource_limits.items():
                if resource not in schedule.resource_utilisation:
                    continue
                
                usage = schedule.resource_utilisation[resource]
                if current_day >= len(usage):
                    continue
                    
                if usage[current_day] > limits:
                    # Find tasks running on this day that can be delayed
                    for task in tasks:
                        if task.is_critical:
                            continue  # Don't delay critical path tasks
                            
                        task_start = (task.start_date - schedule.tasks[0].start_date).days
                        task_end = task_start + task.duration_days
                        
                        if task_start <= current_day < task_end and resource in task.resources_required:
                            # Delay this task by 1 day
                            task.start_date += timedelta(days=1)
                            task.end_date += timedelta(days=1)
                            adjusted += 1
                            break
            
            if adjusted > 0:
                adjusted = 0
                current_day = 0  # Restart check after adjustments
            else:
                current_day += 1
        
        # Recalculate schedule after adjustments
        return SchedulingEngine.calculate_critical_path_method(tasks, schedule.tasks[0].start_date)

    @staticmethod
    def calculate_schedule_risk(tasks: List[Task], iterations: int = 1000) -> Dict:
        """
        Monte Carlo simulation for schedule risk analysis
        """
        import random
        
        durations = []
        risk_profile = {
            "minimum_duration": 9999,
            "maximum_duration": 0,
            "average_duration": 0,
            "percentiles": {}
        }
        
        for _ in range(iterations):
            # Apply random variation (±15%) to each task duration
            varied_tasks = []
            for task in tasks:
                varied = Task(
                    id=task.id,
                    name=task.name,
                    duration_days=int(task.duration_days * random.uniform(0.85, 1.15)),
                    dependencies=task.dependencies.copy(),
                    resources_required=task.resources_required.copy(),
                    is_milestone=task.is_milestone
                )
                varied_tasks.append(varied)
            
            # Run CPM
            try:
                result = SchedulingEngine.calculate_critical_path_method(varied_tasks, datetime.now())
                durations.append(result.project_duration)
            except:
                continue
        
        if not durations:
            return risk_profile
        
        durations.sort()
        risk_profile["minimum_duration"] = durations[0]
        risk_profile["maximum_duration"] = durations[-1]
        risk_profile["average_duration"] = sum(durations) / len(durations)
        
        # Calculate percentiles
        for p in [50, 75, 90, 95]:
            idx = int(len(durations) * p / 100)
            risk_profile["percentiles"][f"p{p}"] = durations[idx]
        
        return risk_profile