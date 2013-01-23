/**
 * User: ArtZub
 * Date: 23.01.13
 * Time: 12:54
 */

'use strict';

(function (vis) {
    vis.meArc = function(d) {
        vis.layers.stat.toFront();
        if (!d._g)
            return;

        d._g.selectAll("path.bar")
            .style({
                "fill-opacity" : .6,
                "stroke-width" : 1,
                "stroke" : function() { return toRgba("#000000", 1); }
            });

        var self = d._g.node();
        self.barDel && self.barDel
            .transition()
            .attr("d", self.delArc.startAngle(PIdiv2 + smallRad )
                .endAngle(PIdiv2 * 3 - smallRad)())
        ;

        self.barAdd && self.barAdd
            .transition()
            .attr("d", self.addArc.startAngle(-PIdiv2 + smallRad )
                .endAngle(PIdiv2 - smallRad)())
        ;

        d._g.selectAll("text.del, text.add")
            .style("visibility", "visible");
    };

    vis.mlArc = function(d) {
        if (!d._g)
            return;

        d._g.selectAll("path.bar")
            .style({
                "fill-opacity" : .3,
                "stroke" : null
            });

        var self = d._g.node();
        if (!self)
            return;

        self.barDel && self.barDel
            .transition()
            .duration(750)
            .ease("elastic")
            .attr("d", self.delArc.startAngle(Math.PI - smallRad)
                .endAngle(Math.PI + smallRad)())
        ;

        self.barAdd && self.barAdd
            .transition()
            .duration(750)
            .ease("elastic")
            .attr("d", self.addArc.startAngle(- smallRad )
                .endAngle(smallRad)())
        ;

        d._g.selectAll("text.del")
            .style("visibility", d.stats && d.stats.delTextVis ? d.stats.delTextVis : "hidden");

        d._g.selectAll("text.add")
            .style("visibility", d.stats && d.stats.addTextVis ? d.stats.addTextVis : "hidden");
    };

    vis.mmArc = function(d) {
        vis.mtt(d);
    };

    vis.clearStat = function() {
        if (vis.layers && vis.layers.stat) {
            vis.layers.stat.selectAll("*").remove();
            vis.layers.stat.cont && (vis.layers.stat.cont = null);
        }
    };

    vis.redrawStat = function(data, layout) {

        layout = layout || vis.layers.stat;

        if (!ghcs.repo || !ghcs.repo.commits || !ghcs.repo.commits.length) {
            vis.clearStat();
            return;
        }

        var textFormat = d3.format(",");

        var bd = d3.extent(data.dates);
        var delta = (bd[1] - bd[0]) * 0.1;

        delta = delta || ONE_DAY;

        bd = [bd[0] - delta, bd[1] + delta];

        var x = d3.time.scale()
                .domain(d3.extent(bd))
                .range([0, w - margin.left - margin.right])
            ;

        var h6 = h/6;

        var y = d3.scale.linear()
            .range([2, h6 * 2])
            .domain([0, ghcs.repo.stats.changes || 1]);

        var sorted = data.commits.slice(0).concat([
            { date : bd[0] + delta / 2, f : { d : 0, a : 0, m : 0 } },
            { date : bd[1] - delta / 2, f : { d : 0, a : 0, m : 0 } }
        ]).sort(vis.sC);

        var layers =
                [
                    {
                        color: colors.deletedFile,
                        values: sorted.map(function (d) {
                            return {t : 1, x: d.date, y0 : 0, y: (d.stats ? -d.stats.f.d : 0)}
                        })},
                    {
                        color: colors.modifiedFile,
                        values: sorted.map(function (d) {
                            return {x: d.date, y0 : 0, y: (d.stats ? d.stats.f.m : 0)}
                        })},
                    {
                        color: colors.addedFile,
                        values: sorted.map(function (d) {
                            return {x: d.date, y0: (d.stats ? d.stats.f.m : 0), y : (d.stats ? d.stats.f.a : 0)}
                        })}
                ]
            ;

        function interpolateSankey(points) {
            var x0 = points[0][0], y0 = points[0][1], x1, y1, x2,
                path = [x0, ",", y0],
                i = 0,
                n = points.length;
            while (++i < n) {
                x1 = points[i][0];
                y1 = points[i][1];
                x2 = (x0 + x1) / 2;
                path.push("C", x2, ",", y0, " ", x2, ",", y1, " ", x1, ",", y1);
                x0 = x1;
                y0 = y1;
            }
            return path.join("");
        }

        var y1 = d3.scale.linear()
                .range([h6 * 4.5, h6 * 3, h6 * 1.5])
                .domain([-ghcs.repo.stats.files, 0, ghcs.repo.stats.files]),
            area = d3.svg.area()
                .interpolate(interpolateSankey /*true ? "linear" : "basis"*/)
                .x(function(d) { return x(d.x); })
                .y0(function(d) { return y1(d.y0); })
                .y1(function(d) { return y1(d.y0 + d.y); })
            ;

        var xAxis = d3.svg.axis()
                .scale(x)
            ;

        layout.cont = layout.cont || layout
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        ;

        layout.cont.selectAll("path.areaFile").remove();

        layout.cont.selectAll("path.areaFile")
            .data(layers)
            .enter()
            .insert("path", ":first-child")
            .attr("class", "areaFile")
            .style("fill-opacity",.1)
            .style("fill", function(d) { return d.color; })
            .transition()
            .duration(750)
            .attr("d", function(d) { return area(d.values); })
        ;


        layout.cont.axis = layout.cont.axis || layout.cont.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + h/2 + ")")
        ;

        layout.cont.axis
            .selectAll("*").remove();

        layout.cont.axis
            .call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start")
        ;

        layout.cont.points = layout.cont.points || layout.cont.append("g")
            .attr("transform", "translate(0," + h/2 + ")")
        ;

        var cData = layout.cont.points.selectAll("g.com")
            .data(data.commits, function(d) { return d.sha; });
        cData.enter()
            .append("g")
            .attr("class", "com")
            .on("mouseover", vis.meArc)
            .on("mouseout", vis.mlArc)
            .on("mousemove", vis.mmArc)
        ;

        cData.each(function(d, g) {
            g = d._g = d3.select(this);
            g.transition()
                .duration(1500)
                .ease("elastic")
                .attr("transform", "translate(" + [ x(d.date), 0] + ")");

            this.center = this.center || g.append("circle")
                .attr("r", 2)
                .style("fill", colors.center)
            ;

            if (!d.stats)
                return;

            var add = this.addArc = d3.svg.arc()
                    .innerRadius(1)
                    .outerRadius(1)
                    .startAngle(- smallRad )
                    .endAngle(smallRad)
                ;
            var del = this.delArc = d3.svg.arc()
                    .innerRadius(1)
                    .outerRadius(1)
                    .startAngle(Math.PI - smallRad)
                    .endAngle(Math.PI + smallRad)
                ;

            (this.barAdd || (
                this.barAdd = g.append("path")
                    .attr("class", "bar")
                    .style({
                        "fill" : colors.added,
                        "fill-opacity" : .3
                    })
                    .attr("d", add())
                ))
                .transition()
                .duration(750)
                .ease("elastic")
                .attr("d", add.outerRadius(y(d.stats.additions))())
            ;

            (this.barDel || (
                this.barDel = g.append("path")
                    .attr("class", "bar")
                    .style({
                        "fill" : colors.deleted,
                        "fill-opacity" : .3
                    })
                    .attr("d", del())
                ))
                .transition()
                .duration(750)
                .ease("elastic")
                .attr("d", del.outerRadius(y(d.stats.deletions))())
            ;

            function sized(s, k) {
                return s * (1 + k);
            }

            var addTop = this.addArcTop = d3.svg.arc()
                    .innerRadius(sized(y(d.stats.additions), .015))
                    .outerRadius(sized(y(d.stats.additions), .025))
                    .startAngle(- smallRad )
                    .endAngle(smallRad)
                ;
            var delTop = this.delArcTop = d3.svg.arc()
                    .innerRadius(sized(y(d.stats.deletions), .015))
                    .outerRadius(sized(y(d.stats.deletions), .025))
                    .startAngle(Math.PI - smallRad)
                    .endAngle(Math.PI + smallRad)
                ;

            (this.barAddTop || (
                this.barAddTop = g.append("path")
                    .style("fill", toRgba(colors.added))
                ))
                .attr("d", addTop())
            ;

            (this.barDelTop || (
                this.barDelTop = g.append("path")
                    .style("fill", toRgba(colors.deleted))
                ))
                .attr("d", delTop())
            ;

            if (d.stats.additions) {
                d.stats.addTextVis = sized(y(d.stats.additions), .029) > h6 / 2 ? "visible" : "hidden";
                (this.labelAdd || (
                    this.labelAdd = g.append("text")
                        .attr("class", "add")
                        .attr("dy", "-.31em")
                        .attr("text-anchor", "middle")
                        .style("fill", colors.added)
                        .text(" + " + textFormat(d.stats.additions))
                    ))
                    .attr("transform", "translate(" + [0, -sized(y(d.stats.additions), .027)] + ")")
                    .attr("visibility", d.stats.addTextVis)
                ;
            }

            if (d.stats.deletions) {
                d.stats.delTextVis = sized(y(d.stats.deletions), .029) > h6 / 2 ? "visible" : "hidden";
                (this.labelDel || (
                    this.labelDel = g.append("text")
                        .attr("class", "del")
                        .attr("dy", ".93em")
                        .attr("text-anchor", "middle")
                        .style("fill", colors.deleted)
                        .text(" - " + textFormat(d.stats.deletions))
                    ))
                    .attr("transform", "translate(" + [0, sized(y(d.stats.deletions), .027)] + ")")
                    //rotate(180)
                    .attr("visibility", d.stats.delTextVis)
                ;
            }
        });

        cData.sort(function(a, b) {
            return a.stats && b.stats ? d3.ascending(b.stats.changes, a.stats.changes) : 0;
        });

        cData.exit().remove();
    };
})(vis || (vis = {}));
