import type { RequestHandler } from "express"
import { asyncHandler } from "../utils/asyncHandler"
import { TheaterService } from "../services/theater.service"
import { sendSuccess , sendError } from "../utils/responseBody"
import z from "zod"

 export const createTheaterSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).optional(),
    city: z.string().min(1).max(100),
    address: z.string().min(1).max(200),
    state: z.string().min(1).max(200).optional(),
    pincode: z.string().min(1).max(200).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    totalScreens: z.number().int().positive().default(1),
    amenities: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
});
const updateTheaterSchema = createTheaterSchema.partial(); 

type TheaterControllerType = {
    createTheater : RequestHandler,
    updateTheater : RequestHandler,
    getAllTheaters : RequestHandler,
    fetchTheater : RequestHandler,
    deleteTheater : RequestHandler,
    getTheaterById : RequestHandler,
}
export const TheaterController : TheaterControllerType = {
        // CREATE THEATER
        createTheater : asyncHandler( async (req, res ) => {
            const parsed = createTheaterSchema.safeParse(req.body);
            if(!parsed.success){
                return sendError(res , 400, "Invalid Input" , parsed.error.issues)
            }
            const theater = await TheaterService.createTheater(parsed.data);
            return sendSuccess(res , 201, theater, "Successfully created the Theater");
        }),

        // UPDATE THEATER
        updateTheater : asyncHandler(async(req, res) => {
            const {id} = req.params;
            if(typeof id !== "string" || !id.trim()){
                return sendError(res, 400, "Invalid Theater Id");
            }
            const parsed = updateTheaterSchema.safeParse(req.body);
            if(!parsed.success){
                return sendError(res , 400, "Invalid Input" , parsed.error.issues)
            }
            const updatedTheaterData = await TheaterService.updateTheater(id,parsed.data)
            if(!updatedTheaterData){
                return sendError(res , 404, "Theater not found");
            }
            return sendSuccess(res, 200, updatedTheaterData, "Theater has been updated")
        }),

        // get theater by ID
        getTheaterById: asyncHandler(async (req, res) => {
            const { id } = req.params;
            if (typeof id !== "string" || !id.trim()) {
                return sendError(res, 400, "Invalid Theater Id");
            }
            const theater = await TheaterService.getTheaterById(id);
            if (!theater) {
                return sendError(res, 404, "Theater not found");
            }
            return sendSuccess(res, 200, theater);
        }),
        // Get all the THEATER
        getAllTheaters : asyncHandler(async ( req, res) => {
                const theaters = await TheaterService.getAllTheaters();
                return sendSuccess(res , 200, theaters)
        }),

        // fetch THEATER by name
        fetchTheater : asyncHandler(async (req , res) => {
            const name = req.query.name;
            if (typeof name !== "string" || !name.trim()) {
                return sendError(res, 400, "Invalid Theater name");
            }
            const foundTheater = await TheaterService.fetchTheater(name);
            
            if(!foundTheater || foundTheater.length == 0){
                return sendError(res , 404, "Not found any Theater on this name");
            }               
            return sendSuccess(res , 200, foundTheater);
        }),

        // Delete Theater 
        deleteTheater : asyncHandler(async (req , res) => {
            const { id } = req.params;
            if (typeof id !== "string" || !id.trim()) {
                return sendError(res, 400, "Invalid Theater Id");
            }
            const deleted = await TheaterService.deleteTheater(id);
            if(!deleted){
                return sendError(res, 404, "Theater not found")
            }
            return sendSuccess (res, 200,deleted, "Theater deleted successfully")
    })
}