const fs = require('fs')

const convertSkeleton = (iData, oData) => {
    oData.skeleton = {
        hash: iData.skeleton.hash,
        spine: "3.8.99",
        images: iData.skeleton.images,
        audio: "",
    }
}

const convertSkins = (iData, oData) => {
    const skins = []
    for (const key in iData.skins) {
        const value = iData.skins[key]
        skins.push({
            name: key,
            attachments: value,
        })
    }
    oData.skins = skins
}

const convertAnimations = (iData, oData) => {
    const iAnimData = iData.animations
    const oAnimData = {}
    Object.assign(oAnimData, iAnimData);
    let ret = true
    for (const animName in oAnimData) {
        const animData = oAnimData[animName]
        for (const animKay in animData) {
            if (animKay == "bones") {
                for (const boneName in animData[animKay]) {
                    const bone = animData[animKay][boneName]
                    for (const boneKey in bone) {
                        if (boneKey == "translate" || boneKey == "rotate" || boneKey == "scale" || boneKey == "shear") {
                            const translates = bone[boneKey]
                            for (const translate of translates) {
                                // const translate = bone[boneKey]
                                if (translate.time == 0) delete translate.time
                                if (translate.angle == 0) delete translate.angle
                                // if (translate.x == 0) delete translate.x
                                // if (translate.y == 0) delete translate.y
                                if (typeof translate.curve == "object") {
                                    const curve = translate.curve
                                    delete translate.curve
                                    translate.curve = curve[0]
                                    if (curve[1] != 0) translate.c2 = curve[1]
                                    if (curve[2] != 1) translate.c3 = curve[2]
                                    if (curve[3] != 1) translate.c4 = curve[3]
                                } else if (typeof translate.curve == "string") {
                                    translate.curve = translate.curve
                                }
                            }
                        }
                    }
                }
            } else if (animKay == "slots") {
                for (const slotName in animData[animKay]) {
                    const slot = animData[animKay][slotName]
                    for (const slotKey in slot) {
                        if (slotKey == "attachment") {
                            const attachments = slot[slotKey]
                            for (const attachment of attachments) {
                                if (attachment.time == 0) delete attachment.time
                            }
                        } else if (slotKey == "color") {
                            const colors = slot[slotKey]
                            for (const color of colors) {
                                const curve = color.curve
                                if (curve == null) continue
                                if (typeof curve == "object") {                    
                                    delete color.curve
                                    color.curve = curve[0]
                                    color.c2 = curve[1]
                                    color.c3 = curve[2]
                                    color.c4 = curve[3]
                                }
                                else if (typeof curve == "string") {
                                    color.curve = curve
                                }
                            }
                        }
                    }
                }
            } else if (animKay == "paths" || animKay == "deform") {
                if (animKay == "paths") {
                    const paths = animData[animKay]
                    const oPaths = {}
                    for (const pathName in paths) {
                        const path = paths[pathName]
                        const oPath = {}
                        for (const key in path) {
                            const value = path[key]
                            // const oValue = {}
                            if (key == "position") {
                                const positions = value
                                const oPositions = []
                                for (const pos of positions) {
                                    const oPos = {
                                        time: pos.time,
                                        position: pos.position,
                                    }
                                    if (oPos.time == undefined) delete oPos.time
                                    if (oPos.position == undefined) delete oPos.position
                                    if (typeof pos.curve == "object") {
                                        oPos.curve = pos.curve[0]
                                        oPos.c2 = pos.curve[1]
                                        oPos.c3 = pos.curve[2]
                                        oPos.c4 = pos.curve[3]
                                    } else if (typeof pos.curve == "string") {
                                        oPos.curve = pos.curve
                                    }

                                    oPositions.push(oPos)
                                }

                                oPath[key] = oPositions
                            } else if (key == "mix") {
                                const mixs = value
                                const oMixs = []
                                for (const mix of mixs) {
                                    const oMix = {
                                        time: mix.time,
                                        rotateMix: mix.rotateMix,
                                    }
                                    if (oMix.time == undefined) delete oMix.time
                                    if (oMix.rotateMix == undefined) delete oMix.rotateMix
                                    if (typeof mix.curve == "object") {
                                        oMix.curve = mix.curve[0]
                                        oMix.c2 = mix.curve[1]
                                        oMix.c3 = mix.curve[2]
                                        oMix.c4 = mix.curve[3]
                                    } else if (typeof mix.curve == "string") {
                                        oMix.curve = mix.curve
                                    }

                                    oMixs.push(oMix)
                                }
                                
                                oPath[key] = oMixs
                            }
                            // oPath[key] = oValue
                        }

                        oPaths[pathName] = oPath
                    }
                    animData.path = oPaths
                    delete animData[animKay]
                }
                // ret = false
            }
        }
    }
    oData.animations = oAnimData
    return ret
}

const convert = (iData, outputPath, inputPath) => {
    if (iData.skeleton.spine == "3.8.99") {
        return
    }
    const oData = {
        skeleton: {},
        bones: iData.bones,
        slots: iData.slots,
        path: [],
        skins: [],
        animations: [],
    }
    if (iData.path) {
        oData.path = iData.path
    } else {
        delete oData.path
    }
    convertSkeleton(iData, oData)
    convertSkins(iData, oData)
    const ret = convertAnimations(iData, oData)

    if (!ret) {
        console.error(`do not support paths: ${inputPath}`)
    }
    fs.writeFileSync(outputPath, JSON.stringify(oData, null, 4))
    return oData
}

const upgrade = (inputPath, outputPath) => {
    if (fs.lstatSync(inputPath).isFile()) {
        const info = JSON.parse(fs.readFileSync(inputPath))
        // if (info.skeleton.spine == "3.8.99") return
        // console.log(`convert: ${inputPath}`)
        convert(info, outputPath, inputPath)
    } else if (fs.lstatSync(inputPath).isDirectory()) {
        const listFiles = (path) => {
            const files = fs.readdirSync(path);
            files.forEach(file => {
               const path1 = `${path}/${file}`
               if (fs.lstatSync(path1).isDirectory()) {
                    listFiles(path1)
               } else if (file.endsWith(".json")) {
                    const atlasPath = path1.substring(0, path1.length - 5) + ".atlas.txt";
                    if (fs.existsSync(atlasPath)) {
                        // console.log(path1)
                        const info = JSON.parse(fs.readFileSync(path1))
                        // console.log(`convert: ${path1}`)
                        convert(info, path1, path1)
                    }
               }
            })
        }
        listFiles(inputPath)
    }
}

let [input, output] = process.argv.slice(2)
if (input == undefined) {
    console.error("err, please specify input file.")
    return
}
if (output == undefined) output = input
// const [input, output] = ["res/3.6.json", "res/3.8.json"]
// const [input, output] = ["res", "res"]
// const [input, output] = ["/Users/tangs/Documents/fish3/Assets/AssetsI", "/Users/tangs/Documents/fish3/Assets/AssetsI"]

console.log(`input:${input}, output:${output}`)
upgrade(input, output)
