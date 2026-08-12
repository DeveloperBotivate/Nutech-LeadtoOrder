import DashboardMetrics from "../components/dashboard/DashboardMetrics"
import DashboardCharts from "../components/dashboard/DashboardCharts"
import PendingTasks from "../components/dashboard/PendingTasks"
import RecentActivities from "../components/dashboard/RecentActivities"

function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4">


        <div className="grid grid-cols-1 gap-6">
          <DashboardMetrics />

          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <DashboardCharts />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <PendingTasks />
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <RecentActivities />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
