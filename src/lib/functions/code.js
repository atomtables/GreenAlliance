export const createCode = (j) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < j; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

export const formatDate = date => {
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
    })
}

export const titleize = text => {
    return text.split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export const underlineText = (doc, text, x, y, dist = 0.5, over = 0.5, width = 0.3, color = [0,0,0]) => {

    doc.text(text, x, y);
    const textWidth = doc.getTextWidth(text);

    doc.setLineWidth(width);
    doc.setDrawColor(color[0], color[1], color[2]);

    const params = {
        xInitial: x + dist - over,
        xFinal: x + dist + over + textWidth,
        y: y + dist
    }
    doc.line(params.xInitial, params.y, params.xFinal, params.y);

}
