"use client"

// Create / Revise are now tabs on the Quotation page itself, so this header
// is just the branding — no mode-toggle button needed here anymore.
const QuotationHeader = ({ image }) => {
    return (
        <div className="flex justify-between items-center mb-8 pt-4">
            <div className="flex items-center gap-6">
                <img src={image || "/placeholder.svg?height=120&width=120"} alt="Logo" className="h-32 w-auto object-contain" />
                <h1 className="text-5xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                    Nutech
                </h1>
            </div>
        </div>
    )
}

export default QuotationHeader
