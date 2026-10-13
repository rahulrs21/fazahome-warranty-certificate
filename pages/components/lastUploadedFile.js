import confetti from "canvas-confetti"; 
import { useState } from "react";
import { LoaderIcon, RotateCw } from "lucide-react";


function LastUploadedFile({ lastPdf, onExtractedDetails }) {

    const [detailsPDF, setDetailsPDF] = useState(null);

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");


    if (!lastPdf) return null;


    const handleGeneratePDF = async (pdfUrl) => {
        setLoading(true);

        const formData = new FormData();
        formData.append("pdfUrl", pdfUrl);
        const res = await fetch("/api/extract", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        setDetailsPDF({ ...data, pdfUrl });

        if (onExtractedDetails) {
            onExtractedDetails({ ...data, pdfUrl }); // pass up to parent
        }


        // Save pdfUrl with details
        setLoading(false);
        setStatus("✅Data extracted successfully!");
        confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.5 },
            colors: ["#bb0000", "#ffffff", "#ffcc00", "#00bbff"]
        });

        setTimeout(() => {
            setStatus(""); // Clear status after 5 seconds
        }, 3000);
    }



    return (

        <div className="max-w-5xl mx-auto my-6">
            <div className="flex items-center gap-3 mb-2">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7V3a1 1 0 011-1h8a1 1 0 011 1v4M7 7h10M7 7v14a1 1 0 001 1h8a1 1 0 001-1V7M7 7h10" />
                </svg>
                <h2 className="text-md font-bold text-gray-800">Last Uploaded PDF</h2>
            </div>
            <div className="overflow-x-auto rounded-lg shadow-sm">
                <table className="min-w-full bg-white border border-gray-200 shadow-lg">
                    <thead>
                        <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Invoice Number</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">PDF Name</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Generate PDF</th>

                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-t">
                            <td className="px-4 py-2">{lastPdf.invoiceNumber}</td>
                            <td className="px-4 py-2">
                                <a
                                    href={lastPdf.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline break-all"
                                >
                                    {lastPdf.fileName}
                                </a>
                            </td>
                            <td className="px-4 py-2">{lastPdf.createdAt}</td>
                            <td className="px-4 py-2">
                                

                                <button onClick={() => handleGeneratePDF(lastPdf.pdfUrl)} className="text-white bg-blue-500 border-0 py-1 px-5 focus:outline-none hover:bg-blue-600 rounded text-lg cursor-pointer">{loading ? ( <div className="flex justify-center items-center">Processing <RotateCw className='h-5 w-5 ml-2 text-white transition-transform duration-500 animate-spin' /></div>  )  : "View"}</button>

                                <p>{status}</p>

                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>




            {loading && (
                
                    <div className="mt-5 flex justify-center items-center">
                        {`Generating PDF`}
                        <LoaderIcon className={`ml-2 inline-block animate-spin `} />
                    </div>
            )}

            












        </div>
    )
}

export default LastUploadedFile

export { getTeamPageProps as getServerSideProps } from "../../lib/server/teamAuth";
